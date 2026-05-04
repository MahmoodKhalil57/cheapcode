"""mizan.convergence — convergence-without-contact detector (atom 0019).

Walks fact-files supporting a claim, scores three independence axes
(citation-graph, methodology-class, temporal-gap), scores structural
identity, and returns a ConvergenceMeasurement that energy.lift_via_
convergence consumes.

Mizaj M03 made operational at the runtime layer: the measurement
itself records its own measured_at + wall_clock_ms — atom 0007
(measurement is an artifact, not a guess).
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from pathlib import Path

from mizan.types import (
    ConvergenceMeasurement,
    Witness,
    utc_now_iso,
    utc_now_ms,
)


# ─── Citation-graph score ────────────────────────────────────────────


def citation_graph_score(files: list[Path]) -> float:
    """Score [0, 1]: 1.0 = no inter-citation among files; 0.0 = mutual.

    For each ordered pair (a, b): does file a's text mention file b's
    stem? Each such directed edge counts. The score is 1 minus the
    fraction of possible directed edges actually present.

    Single file → 0.0 (no convergence possible with one witness).
    """
    if len(files) < 2:
        return 0.0
    stems = [f.stem for f in files]
    edges = 0
    for i, fa in enumerate(files):
        try:
            text_a = fa.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        for j, _fb in enumerate(files):
            if i == j:
                continue
            if stems[j] in text_a:
                edges += 1
    n = len(files)
    max_edges = n * (n - 1)
    return 1.0 - min(1.0, edges / max(1, max_edges))


# ─── Methodology-axis score ──────────────────────────────────────────


def methodology_axis_score(witnesses: list[Witness]) -> float:
    """Score [0, 1]: distinct methodology_class values across witnesses.

    All distinct → 1.0. All same → 1/N (lowest possible). Partial
    distinct → fraction of distinct classes.

    Atom 0019: distinct methodology axes = independent EVOLUTION,
    not coordinated review.
    """
    if not witnesses:
        return 0.0
    classes = {w.methodology_class for w in witnesses}
    return len(classes) / len(witnesses)


# ─── Temporal-gap score ──────────────────────────────────────────────


_SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000


def temporal_gap_score(witnesses: list[Witness]) -> float:
    """Score [0, 1]: how far apart in time the witnesses were authored.

    Range:
      ≥7 days span → 1.0  (distinct sessions, fully independent timing)
      ≥1 day span → ~0.7  (likely different sessions)
      same day  → ≤0.5  (could be coordinated)
      same hour → ~0.3  (likely same-session contamination)
      identical → 0.2
    """
    if len(witnesses) < 2:
        return 0.0
    timestamps_ms = []
    for w in witnesses:
        try:
            ts = w.measured_at.rstrip("Z")
            dt = datetime.fromisoformat(ts).replace(tzinfo=timezone.utc)
            timestamps_ms.append(int(dt.timestamp() * 1000))
        except (ValueError, TypeError):
            continue
    if len(timestamps_ms) < 2:
        return 0.5  # unparseable → neutral
    span_ms = max(timestamps_ms) - min(timestamps_ms)
    if span_ms == 0:
        return 0.2
    if span_ms >= _SEVEN_DAYS_MS:
        return 1.0
    # Logarithmic ramp: 1 hour = ~0.3, 1 day = ~0.7, 7 days = 1.0
    one_hour_ms = 60 * 60 * 1000
    if span_ms <= one_hour_ms:
        return 0.3
    one_day_ms = 24 * one_hour_ms
    if span_ms <= one_day_ms:
        # interpolate 0.3 → 0.7 over [1h, 1d]
        frac = (span_ms - one_hour_ms) / (one_day_ms - one_hour_ms)
        return 0.3 + frac * 0.4
    # interpolate 0.7 → 1.0 over [1d, 7d]
    frac = (span_ms - one_day_ms) / (_SEVEN_DAYS_MS - one_day_ms)
    return 0.7 + frac * 0.3


# ─── Structural-identity score ───────────────────────────────────────


def structural_identity_score(
    claim_name: str,
    *,
    file_texts: dict[Path, str] | None = None,
) -> float:
    """Score [0, 1]: how specifically the structural move is named
    consistently across supporting files.

    Heuristic: count files whose text references claim_name. ≥3 → 0.85;
    2 → 0.7; 1 → 0.5; 0 → 0.5 (neutral default — we don't know).

    More precise scoring (e.g. AST-shape comparison) is post-v1 scope.
    The current heuristic matches what burhan-converge surfaced
    empirically and stays bounded [0, 1].
    """
    if not file_texts:
        return 0.5
    pat = re.compile(rf"\b{re.escape(claim_name)}\b")
    mentions = sum(1 for _, text in file_texts.items() if pat.search(text))
    if mentions >= 3:
        return 0.85
    if mentions == 2:
        return 0.7
    if mentions == 1:
        return 0.55
    return 0.5


# ─── Independence aggregation ────────────────────────────────────────


def independence_score(citation: float, methodology: float, temporal: float) -> float:
    """Geometric mean of the three independence sub-scores.

    Geometric mean is appropriate because: any one sub-score = 0
    means independence is broken on that axis (mutual citation OR
    same methodology OR same instant); the other axes can't rescue
    it. Atom 0019 step 4: independence is multi-dimensional AND
    the dimensions are necessary, not sufficient on their own.
    """
    return (citation * methodology * temporal) ** (1 / 3)


# ─── Top-level detect ────────────────────────────────────────────────


def detect_convergence(
    claim_name: str,
    *,
    witnesses: list[Witness],
    file_texts: dict[Path, str] | None = None,
) -> ConvergenceMeasurement:
    """Run the full atom-0019 measurement: walk citation graph, score
    methodology + temporal independence, score structural identity,
    return a ConvergenceMeasurement ready for energy.lift_via_convergence.

    Atom 0018: measure first, decide second. The function returns the
    measurement; the lift formula is in energy.py.
    """
    started_ms = utc_now_ms()

    if not witnesses:
        return ConvergenceMeasurement(
            claim_name=claim_name,
            witnesses=[],
            citation_graph_sub=0.0,
            methodology_axis_sub=0.0,
            temporal_gap_sub=0.0,
            structural_identity=0.0,
            measured_at=utc_now_iso(),
            wall_clock_ms=max(1, utc_now_ms() - started_ms),
        )

    paths = [Path(w.file_path) for w in witnesses]
    cit = citation_graph_score(paths)
    meth = methodology_axis_score(witnesses)
    temp = temporal_gap_score(witnesses)

    if file_texts is None:
        file_texts = {}
        for p in paths:
            try:
                file_texts[p] = p.read_text(encoding="utf-8", errors="ignore")
            except OSError:
                file_texts[p] = ""

    struct = structural_identity_score(claim_name, file_texts=file_texts)

    return ConvergenceMeasurement(
        claim_name=claim_name,
        witnesses=witnesses,
        citation_graph_sub=cit,
        methodology_axis_sub=meth,
        temporal_gap_sub=temp,
        structural_identity=struct,
        measured_at=utc_now_iso(),
        wall_clock_ms=max(1, utc_now_ms() - started_ms),
    )
