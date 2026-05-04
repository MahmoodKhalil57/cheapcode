"""mizan — energy-transformation runtime for the substrate-suite.

Substrate citations:
  - khazīna atom 0005 (Sridhar-class energy-transformation, one-shot)
  - khazīna atom 0018 (iterative energy-transformation, runtime form)
  - khazīna atom 0019 (convergence-without-contact lifts confidence)
  - mizaj M11 (tier-the-source-before-citing)
  - mizaj M14 (authentication-grade-bounds-confidence)
  - mizaj M03 (mark-assumption-envelope) — every Probe records its
    measurement envelope (wall_clock_ms, measured_at, source).

Public API:
  >>> from mizan import probe_now, lift_via_convergence, AuthGrade
  >>> p = probe_now()             # measure current physical-reality state
  >>> lift = lift_via_convergence(...)
  >>> lift.applied_at, lift.audit_trail
"""

from mizan.types import (
    AuthGrade,
    SourceTier,
    Constraint,
    Probe,
    Witness,
    ConvergenceMeasurement,
    Lift,
    DecisionBoundary,
    AuditRecord,
)
from mizan.probe import probe_now
from mizan.grades import AUTH_LADDER, SOURCE_TIER_LADDER, ladder_ceiling
from mizan.energy import (
    lift_via_convergence,
    transform_to_binding_axis,
    DEFAULT_DAMPENING,
    AUTH_CEILING_CAP,
)
from mizan.convergence import (
    detect_convergence,
    independence_score,
    structural_identity_score,
    citation_graph_score,
    methodology_axis_score,
    temporal_gap_score,
)
from mizan.audit import AuditTrail, audit_record
from mizan.calibration import fit_dampening_from_outcomes, CalibrationResult

__version__ = "0.1.0"

__all__ = [
    "AuthGrade", "SourceTier", "Constraint", "Probe", "Witness",
    "ConvergenceMeasurement", "Lift", "DecisionBoundary", "AuditRecord",
    "probe_now",
    "AUTH_LADDER", "SOURCE_TIER_LADDER", "ladder_ceiling",
    "lift_via_convergence", "transform_to_binding_axis",
    "DEFAULT_DAMPENING", "AUTH_CEILING_CAP",
    "detect_convergence", "independence_score", "structural_identity_score",
    "citation_graph_score", "methodology_axis_score", "temporal_gap_score",
    "AuditTrail", "audit_record",
    "fit_dampening_from_outcomes", "CalibrationResult",
]
