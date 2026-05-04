"""mizan.types — wallclock-grounded core dataclasses.

Every measurement carries:
  - measured_at:    ISO-8601 UTC timestamp (when the measurement was taken)
  - wall_clock_ms:  how long the measurement itself took (cost of measurement)
  - source:         what produced the measurement (tool/probe identifier)

Stale-aware: every consumer of a Probe records `measurement_age_ms` =
`now - measured_at` so decisions made on stale data are honest about it
(mizaj M03 — mark-assumption-envelope).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any


def utc_now_iso() -> str:
    """ISO-8601 UTC timestamp with 'Z' suffix. Single source of truth."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def utc_now_ms() -> int:
    """Unix epoch milliseconds. Used for wall_clock_ms diffs."""
    return int(datetime.now(timezone.utc).timestamp() * 1000)


# ─── Authentication-grade ladder (mizaj M14) ─────────────────────────


class AuthGrade(str, Enum):
    """Authentication-grade tier per mizaj M14 (Sahih methodology applied
    to burhan claims). Higher grade = higher confidence ceiling."""

    SAHIH = "sahih"  # verified isnad, no flaws — ceiling 0.95+
    HASAN = "hasan"  # acceptable, one weakness — ceiling 0.85
    DAIF = "daif"    # weak chain — ceiling 0.40 (retain for audit)
    MAWDU = "mawdu"  # fabricated — ceiling 0.10 (retain as anti-pattern)


# ─── Source-tier ladder (mizaj M11) ──────────────────────────────────


class SourceTier(str, Enum):
    """Source-class tier per mizaj M11. Parallel axis to AuthGrade;
    both bound confidence simultaneously (lower ceiling wins)."""

    L1_OWN_RECEIPT = "L1"   # own measurement — ceiling 0.95
    L2_VENDOR_DOC = "L2"    # vendor doc / spec — ceiling 0.92
    L3_ACADEMIC = "L3"      # peer-reviewed academic — ceiling 0.90
    L4_AGGREGATOR = "L4"    # leaderboard / single witness — ceiling 0.78
    L5_CHAT_GOSSIP = "L5"   # rumor / unverified — ceiling 0.50


# ─── Probe — the physical-reality measurement (atom 0018) ────────────


@dataclass(frozen=True)
class Probe:
    """A physical-reality measurement at a decision boundary.

    Atoms 0018 prescribes: at each decision boundary, ground physical-
    reality state (NOT from memory) — this dataclass IS the ground.
    """

    measured_at: str            # ISO-8601 UTC timestamp
    wall_clock_ms: int          # how long the measurement took
    source: str                 # probe identifier (e.g. "mizan-probe/disk-mem-git")
    values: dict[str, Any]      # measured fields (disk_free_gb, mem_free_mb, ...)
    notes: list[str] = field(default_factory=list)

    def age_ms(self, *, now_ms: int | None = None) -> int:
        """Stale-aware age: how long ago was this measurement taken?
        Decisions made on a Probe with high age_ms are by-construction
        less grounded than those made on fresh probes.

        Mizaj M03 (mark-assumption-envelope) made operational: the
        consumer that picks up an old probe sees the staleness.
        """
        ref = now_ms if now_ms is not None else utc_now_ms()
        # Parse measured_at back to ms.
        # Strip trailing "Z", handle fractional seconds.
        ts = self.measured_at.rstrip("Z")
        dt = datetime.fromisoformat(ts).replace(tzinfo=timezone.utc)
        measured_ms = int(dt.timestamp() * 1000)
        return max(0, ref - measured_ms)


# ─── Constraint — an axis with budget + conversion factors (atom 0005) ─


@dataclass(frozen=True)
class Constraint:
    """One constraint axis the decision-maker is operating under.

    Atom 0005 (energy-transformation) prescribes: identify the constants
    you cannot change. This dataclass represents one such constant —
    the axis's current value, its budget cap, and the conversion factor
    needed to express other axes in this axis's units.
    """

    name: str                   # e.g. "wall_time_seconds", "spend_usd", "tokens"
    current: float              # current value on this axis
    budget_cap: float           # cap (e.g. ceiling on wall-time before stop)
    units: str                  # human-readable unit for audit
    # Conversion to a reference axis. e.g. wall_time → usd ≈ $0.001/sec for
    # an LLM call. Used by transform_to_binding_axis().
    conversion_to_reference: float = 1.0
    reference_axis: str = ""

    @property
    def headroom(self) -> float:
        """How much budget is left on this axis? Negative = overshoot."""
        return self.budget_cap - self.current

    @property
    def utilization(self) -> float:
        """Fraction of budget consumed. >1.0 = overshoot."""
        if self.budget_cap == 0:
            return float("inf") if self.current != 0 else 0.0
        return self.current / self.budget_cap

    def is_binding(self, *, threshold: float = 0.85) -> bool:
        """Atom 0018: the binding constraint is the one closest to its
        budget cap. Default threshold = 0.85 utilization."""
        return self.utilization >= threshold


# ─── Witness — one independent attestation of a claim (atom 0019) ────


@dataclass(frozen=True)
class Witness:
    """One fact-file / experiment / source supporting a claim.

    Atom 0019: convergence-without-contact requires two witnesses with
    independent EVOLUTION (different sessions, different methods, no
    inter-citation). This dataclass is the witness record.
    """

    file_path: str              # absolute or repo-relative path
    methodology_class: str      # "human-pilot" / "deterministic-test" / "runtime-scorer" / "llm-grader" / ...
    measured_at: str            # when this witness was authored
    auth_grade: AuthGrade = AuthGrade.HASAN
    source_tier: SourceTier = SourceTier.L1_OWN_RECEIPT
    notes: list[str] = field(default_factory=list)


# ─── ConvergenceMeasurement — the energy-input to the lift formula ───


@dataclass(frozen=True)
class ConvergenceMeasurement:
    """The pre-lift measurement. Inputs to the energy-transformation
    formula. Atom 0019 step 4: MEASURE first, decide second."""

    claim_name: str
    witnesses: list[Witness]
    citation_graph_sub: float   # 1.0 = no inter-citation, 0.0 = mutual
    methodology_axis_sub: float # 1.0 = distinct methodology classes
    temporal_gap_sub: float     # 1.0 = ≥7 days apart, 0.3 = same session
    structural_identity: float  # 1.0 = identical structural move, 0.5 = same shape, 0.2 = topical
    measured_at: str
    wall_clock_ms: int

    @property
    def independence(self) -> float:
        """Geometric mean of the three independence sub-scores."""
        return (self.citation_graph_sub * self.methodology_axis_sub * self.temporal_gap_sub) ** (1 / 3)

    @property
    def convergence_energy(self) -> float:
        """The energy available for transformation: independence ×
        structural-identity. Bounded [0, 1]. Atom 0019 step 4."""
        return self.independence * self.structural_identity


# ─── Lift — the output of the energy-transformation (atom 0019) ──────


@dataclass(frozen=True)
class Lift:
    """A confidence-ceiling lift event. Carries the full audit trail
    so the lift's basis can be re-checked against world-state at
    any later time (atom 0007 — anti-fabrication-via-artifact)."""

    claim_name: str
    ceiling_before: float
    ceiling_after: float
    lift_amount: float
    convergence: ConvergenceMeasurement
    dampening: float            # the hyperparameter used
    auth_ceiling_cap: float     # the binding cap (mizaj M14)
    applied_at: str
    measurement_age_ms: int     # staleness of the input convergence at lift time
    audit_trail: dict[str, Any] = field(default_factory=dict)

    @property
    def relative_lift(self) -> float:
        """Lift as fraction of available ceiling distance."""
        distance = max(self.auth_ceiling_cap - self.ceiling_before, 1e-9)
        return self.lift_amount / distance


# ─── DecisionBoundary — atom 0018 runtime form ───────────────────────


@dataclass(frozen=True)
class DecisionBoundary:
    """One decision-boundary record per atom 0018: probe → identify
    binding constraint → convert via grounded factors → pick min-cost
    move on binding axis → log outcome.

    The asymmetry — measure first, decide second — is encoded in the
    field order: probes come BEFORE chosen_move."""

    boundary_id: str
    probes: list[Probe]
    constraints: list[Constraint]
    binding_constraint_name: str
    chosen_move: str
    rationale: str
    measured_at: str
    wall_clock_ms: int          # total time spent at this boundary
    outcome: dict[str, Any] | None = None  # filled in later when observed


# ─── AuditRecord — JSONL line in the audit trail ─────────────────────


@dataclass(frozen=True)
class AuditRecord:
    """One line in the JSONL audit trail. Every mizan operation that
    affects the .bn graph (lift, cap, decision) appends one of these.
    """

    record_id: str
    record_type: str            # "lift" | "cap" | "decision" | "probe"
    measured_at: str
    wall_clock_ms: int
    payload: dict[str, Any]
