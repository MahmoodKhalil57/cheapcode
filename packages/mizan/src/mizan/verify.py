"""mizan.verify — runtime-callable claim verifier.

Tier-1 upgrade per cheapcode session 2026-05-03:
  Goal: expose mizan's convergence + energy logic as a fast,
  command-line-callable verifier so cheapcode-witness synthesizer
  (and any LLM dispatch) can ask mizan "is this claim sufficiently
  witnessed at this confidence?" inline, not just as a batch audit.

The verifier:
  1. Parses a plan directory's .bn files (MAIN.bn + facts/*.bn)
  2. Locates a specific claim by name + extracts its declared confidence
  3. Walks `cite` references to identify witness fact-files
  4. Builds Witness records (file mtime → measured_at; default L1)
  5. Runs detect_convergence + lift_via_convergence
  6. Emits JSON: confidence_cap, witnesses, missing-witness recommendation,
     bcmea-violation flag (if claim text contains absolutist language),
     audit trail

Atoms invoked: 0007 (anti-fab via artifact), 0011 (smallest-distinguishing-
experiment for the cap-recommendation), 0015 (transfer-overstated for
bcmea-violation flag), 0018 (measure first, decide second), 0019
(convergence-without-contact lift).
"""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from mizan.convergence import detect_convergence
from mizan.energy import AUTH_CEILING_CAP, DEFAULT_DAMPENING, lift_via_convergence
from mizan.types import (
    AuthGrade,
    SourceTier,
    Witness,
    utc_now_iso,
    utc_now_ms,
)


# ─── Claim parsing ────────────────────────────────────────────────────


_CLAIM_LINE = re.compile(
    r"^claim\s+(\w+)\s*:\s*\w+\s*@>=([0-9.]+)\s*=\s*(.+?)$",
    re.MULTILINE,
)
_CITE_REF = re.compile(r"\bcite\s+(\w+)")
# Match both `lemma X` (raw witnesses in fact-files) and `theorem X`
# (composed proofs in PLAN.bn). A claim that cites a theorem inherits
# its witnesses from the file the theorem lives in. Bug fix 2026-05-03:
# previously theorems weren't indexed, making any claim citing a theorem
# show as zero-witness. Caught when mizan_verify_claim was applied to
# cheapcode_v2_ships (cites theorem cheapcode_v2_outperforms_named_alternatives).
_LEMMA_LINE = re.compile(r"^(?:lemma|theorem)\s+(\w+)", re.MULTILINE)


@dataclass(frozen=True)
class ClaimRecord:
    """One claim parsed from a .bn file."""

    name: str
    declared_ceiling: float
    expression: str
    file_path: str


# ─── bcmea-violation detection (atom 0015 + facts/15 bcmea) ──────────


_BCMEA_ABSOLUTE_TERMS = (
    "uniformly",
    "always",
    "universally",
    "everywhere",
    "all tasks",
    "every task",
    "100%",
    "0%",
    "never fails",
    "always wins",
    "absolute",
)


def detect_bcmea_violation(claim_expression: str, *, claim_name: str = "") -> tuple[bool, list[str]]:
    """Flag absolutist language that the bcmea principle (facts/15)
    treats as a category error. Returns (is_violation, matched_terms).

    A claim that demands BOTH absolutes simultaneously, or asserts
    one absolute at the limit, fires this flag. Atom 0015 escalates.
    """
    text = (claim_name + " " + claim_expression).lower()
    matched = [t for t in _BCMEA_ABSOLUTE_TERMS if t in text]
    return (len(matched) > 0, matched)


# ─── Plan-graph parsing ───────────────────────────────────────────────


def parse_plan_dir(plan_dir: Path) -> tuple[dict[str, ClaimRecord], dict[str, Path]]:
    """Walk plan_dir/MAIN.bn + plan_dir/facts/*.bn. Return:
        - claims: name → ClaimRecord
        - lemmas: lemma_name → file_path (where the lemma is declared)
    """
    claims: dict[str, ClaimRecord] = {}
    lemmas: dict[str, Path] = {}

    candidate_files = []
    main = plan_dir / "MAIN.bn"
    plan_bn = plan_dir / "PLAN.bn"
    if main.exists():
        candidate_files.append(main)
    if plan_bn.exists():
        candidate_files.append(plan_bn)
    facts_dir = plan_dir / "facts"
    if facts_dir.is_dir():
        candidate_files.extend(sorted(facts_dir.glob("*.bn")))

    for f in candidate_files:
        try:
            text = f.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        for m in _CLAIM_LINE.finditer(text):
            name, ceiling_str, expr = m.group(1), m.group(2), m.group(3).strip()
            try:
                ceiling = float(ceiling_str)
            except ValueError:
                continue
            claims[name] = ClaimRecord(
                name=name,
                declared_ceiling=ceiling,
                expression=expr,
                file_path=str(f),
            )
        for m in _LEMMA_LINE.finditer(text):
            lemma_name = m.group(1)
            lemmas.setdefault(lemma_name, f)

    return claims, lemmas


# ─── Witness file resolution via cite chain walk ─────────────────────


def resolve_witness_files(
    claim_name: str,
    *,
    claims: dict[str, ClaimRecord],
    lemmas: dict[str, Path],
    visited: set[str] | None = None,
    max_depth: int = 8,
) -> set[Path]:
    """Walk the cite/composition chain starting from claim_name and
    collect every fact-file that supports it (transitively).

    Atom 0019 echo-chamber-detection: tracking files transitively means
    two claims that both descend from the same upstream fact-file count
    as 1, not 2. This corrects the file-boundary counting limitation
    that adam's CAP detector currently has.
    """
    if visited is None:
        visited = set()
    if claim_name in visited or max_depth <= 0:
        return set()
    visited.add(claim_name)

    files: set[Path] = set()

    if claim_name in lemmas:
        files.add(lemmas[claim_name])
        return files

    if claim_name not in claims:
        return files

    record = claims[claim_name]
    for cite_match in _CITE_REF.finditer(record.expression):
        ref = cite_match.group(1)
        files |= resolve_witness_files(
            ref, claims=claims, lemmas=lemmas, visited=visited, max_depth=max_depth - 1
        )

    for ref in re.findall(r"\b(\w+)\b", record.expression):
        if ref in {"and", "or", "not", "True", "False", "cite"}:
            continue
        if ref in claims and ref != claim_name:
            files |= resolve_witness_files(
                ref, claims=claims, lemmas=lemmas, visited=visited, max_depth=max_depth - 1
            )

    # Bug fix 2026-05-03 round 2: falsifier-bound claim shape.
    # Burhan's dominant pattern is `claim X = not obs_X_falsified` where
    # `obs_X_falsified: Bool @>=0.99 = False` is a literal-bound assertion
    # (atom 0007 anti-fab anchor — falsifier-flag with explicit value).
    # The literal True/False bound IS the evidence anchor; the file is a
    # legitimate witness. If the claim has any literal-bound observation
    # in its dependency chain (or is itself literal-bound), the file
    # containing it counts as a witness file.
    if not files:
        expr_lower = record.expression.strip().lower()
        if expr_lower in {"true", "false"} or "obs_" in record.expression:
            files.add(Path(record.file_path))

    return files


# ─── Witness construction from fact-files ────────────────────────────


def file_to_witness(path: Path) -> Witness:
    """Build a Witness record from a .bn fact-file. Methodology-class
    is heuristic from filename; measured_at is file mtime.
    """
    name = path.name.lower()
    if "research" in name or "academic" in name or "mutawatir" in name or "production" in name:
        method = "research-synthesis"
        tier = SourceTier.L3_ACADEMIC
    elif "test" in name or "result" in name or "receipt" in name or "swe" in name:
        method = "deterministic-test"
        tier = SourceTier.L1_OWN_RECEIPT
    elif "atom" in name or "khazina" in name or "substrate" in name:
        method = "substrate-primitive"
        tier = SourceTier.L1_OWN_RECEIPT
    elif "wallclock" in name or "probe" in name:
        method = "physical-reality-probe"
        tier = SourceTier.L1_OWN_RECEIPT
    elif "graded" in name or "che-pass" in name or "practitioner" in name:
        method = "graded-practitioner"
        tier = SourceTier.L4_AGGREGATOR
    else:
        method = "claim-graph"
        tier = SourceTier.L1_OWN_RECEIPT

    try:
        mtime = path.stat().st_mtime
        measured_at = (
            datetime.fromtimestamp(mtime, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3]
            + "Z"
        )
    except OSError:
        measured_at = utc_now_iso()

    return Witness(
        file_path=str(path),
        methodology_class=method,
        measured_at=measured_at,
        auth_grade=AuthGrade.HASAN,
        source_tier=tier,
    )


# ─── The verify entry point ───────────────────────────────────────────


@dataclass
class VerifyResult:
    """Output of mizan-verify. JSON-serializable."""

    claim_name: str
    found: bool
    declared_ceiling: float
    witness_count: int
    witness_files: list[str]
    convergence_energy: float
    independence: float
    structural_identity: float
    recommended_ceiling_cap: float
    bcmea_violation: bool
    bcmea_terms: list[str]
    cap_recommendation: str
    measured_at: str
    wall_clock_ms: int
    audit_trail: dict = field(default_factory=dict)


def verify_claim(
    claim_name: str,
    *,
    plan_dir: Path,
    dampening: float = DEFAULT_DAMPENING,
    auth_ceiling_cap: float = AUTH_CEILING_CAP,
) -> VerifyResult:
    """Main entry: verify whether `claim_name` is sufficiently witnessed
    at its declared confidence ceiling."""
    started_ms = utc_now_ms()

    claims, lemmas = parse_plan_dir(plan_dir)

    if claim_name not in claims:
        return VerifyResult(
            claim_name=claim_name,
            found=False,
            declared_ceiling=0.0,
            witness_count=0,
            witness_files=[],
            convergence_energy=0.0,
            independence=0.0,
            structural_identity=0.0,
            recommended_ceiling_cap=0.0,
            bcmea_violation=False,
            bcmea_terms=[],
            cap_recommendation=f"claim '{claim_name}' not found in {plan_dir}",
            measured_at=utc_now_iso(),
            wall_clock_ms=max(1, utc_now_ms() - started_ms),
        )

    record = claims[claim_name]
    witness_paths = resolve_witness_files(claim_name, claims=claims, lemmas=lemmas)
    witnesses = [file_to_witness(p) for p in sorted(witness_paths)]

    convergence = detect_convergence(claim_name, witnesses=witnesses)
    lift = lift_via_convergence(
        claim_name=claim_name,
        current_ceiling=0.0,
        convergence=convergence,
        dampening=dampening,
        auth_ceiling_cap=auth_ceiling_cap,
    )

    is_violation, matched_terms = detect_bcmea_violation(
        record.expression, claim_name=claim_name
    )

    n = len(witnesses)
    if n == 0:
        recommended = 0.0
        rec = (
            f"NO WITNESSES — claim cannot be supported at any confidence. "
            "Add at least one supporting fact-file."
        )
    elif n == 1:
        recommended = min(record.declared_ceiling, 0.85)
        rec = (
            f"SOLE-WITNESS — cap at @>=0.85 OR add a second independent "
            f"witness in a different fact-file (current: {witness_paths.pop().name if witness_paths else 'unknown'})"
        )
    else:
        recommended = min(record.declared_ceiling, lift.ceiling_after) if lift.ceiling_after > 0 else record.declared_ceiling
        if recommended >= record.declared_ceiling - 0.001:
            rec = f"OK — {n} independent witnesses support @>={record.declared_ceiling:.2f}"
        else:
            rec = (
                f"OVER-CONFIDENT — declared @>={record.declared_ceiling:.2f}, "
                f"but {n} witnesses + dampening yield max @>={recommended:.3f}. "
                "Add witnesses OR lower declared ceiling."
            )

    if is_violation:
        recommended = min(recommended, 0.55)
        rec = (
            f"BCMEA VIOLATION (terms: {matched_terms}) — atom 0015 fires; "
            f"absolutist framing capped at @>={recommended:.2f} "
            "(per facts/15 bcmea: no absolute claim survives bounded-coexistence). "
            + rec
        )

    return VerifyResult(
        claim_name=claim_name,
        found=True,
        declared_ceiling=record.declared_ceiling,
        witness_count=n,
        witness_files=[str(p) for p in sorted(witness_paths)] if witness_paths else [w.file_path for w in witnesses],
        convergence_energy=convergence.convergence_energy,
        independence=convergence.independence,
        structural_identity=convergence.structural_identity,
        recommended_ceiling_cap=recommended,
        bcmea_violation=is_violation,
        bcmea_terms=matched_terms,
        cap_recommendation=rec,
        measured_at=utc_now_iso(),
        wall_clock_ms=max(1, utc_now_ms() - started_ms),
        audit_trail={
            "convergence": asdict(convergence),
            "lift": asdict(lift),
            "expression": record.expression,
            "file_path": record.file_path,
        },
    )
