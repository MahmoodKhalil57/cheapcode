"""mizan.energy — the energy-transformation lift formula (atom 0019)
runtime form (atoms 0005 + 0018 reflexively applied).

Public API:
  lift_via_convergence(claim_name, current_ceiling, convergence, dampening)
    → Lift with full audit trail.
  transform_to_binding_axis(constraints) → the most-loaded constraint
    (atom 0018 binding-axis selection).

The formula:
    convergence_energy = independence × structural_identity
    ceiling_distance   = auth_ceiling_cap - current_ceiling
    lift_amount        = convergence_energy × ceiling_distance × dampening
    ceiling_after      = min(auth_ceiling_cap, current_ceiling + lift_amount)

The asymmetry (atom 0018 — measure first, decide second) is encoded in
the function's parameters: convergence MUST be a fully-formed
ConvergenceMeasurement (already measured) BEFORE the lift can be
computed. The function does not measure; it only transforms.
"""

from __future__ import annotations

from typing import Final

from mizan.types import (
    AuditRecord,
    Constraint,
    ConvergenceMeasurement,
    Lift,
    utc_now_iso,
    utc_now_ms,
)

DEFAULT_DAMPENING: Final[float] = 0.5
"""Atom 0019 step 4 calibrated start. Calibration module trains this
hyperparameter against observed (lift, falsifier_outcome) pairs."""

AUTH_CEILING_CAP: Final[float] = 0.95
"""Mizaj M14 sahih ceiling. Lift NEVER exceeds this — the binding
constraint that bounds every transformation."""


def lift_via_convergence(
    *,
    claim_name: str,
    current_ceiling: float,
    convergence: ConvergenceMeasurement,
    dampening: float = DEFAULT_DAMPENING,
    auth_ceiling_cap: float = AUTH_CEILING_CAP,
) -> Lift:
    """Compute the auto-confidence-lift for a claim with measured
    convergence-without-contact support.

    Atom 0019: convergence-energy × ceiling-distance × dampening.
    Atom 0018: every component is grounded — convergence was measured
    first; ceiling-distance is computed from the binding ladder
    (mizaj M14); dampening is the calibrated hyperparameter.

    The Lift returned is the COMPLETE audit trail — every input is
    preserved so the lift's basis can be re-checked at any later time.
    """
    if not 0.0 <= current_ceiling <= 1.0:
        raise ValueError(f"current_ceiling out of [0,1]: {current_ceiling}")
    if not 0.0 <= dampening <= 1.0:
        raise ValueError(f"dampening out of [0,1]: {dampening}")
    if not 0.0 <= auth_ceiling_cap <= 1.0:
        raise ValueError(f"auth_ceiling_cap out of [0,1]: {auth_ceiling_cap}")

    energy = convergence.convergence_energy
    distance = max(0.0, auth_ceiling_cap - current_ceiling)
    raw_lift = energy * distance * dampening
    lift_amount = round(min(distance, raw_lift), 6)
    ceiling_after = round(min(auth_ceiling_cap, current_ceiling + lift_amount), 6)

    applied_at = utc_now_iso()
    measurement_age_ms = max(0, utc_now_ms() - _parse_iso_to_ms(convergence.measured_at))

    audit_trail = {
        "formula": "convergence_energy × ceiling_distance × dampening",
        "convergence_energy": round(energy, 6),
        "ceiling_distance": round(distance, 6),
        "dampening": dampening,
        "raw_lift": round(raw_lift, 6),
        "capped_lift": lift_amount,
        "auth_ceiling_cap": auth_ceiling_cap,
        "n_witnesses": len(convergence.witnesses),
        "independence_subs": {
            "citation_graph": convergence.citation_graph_sub,
            "methodology_axis": convergence.methodology_axis_sub,
            "temporal_gap": convergence.temporal_gap_sub,
        },
        "structural_identity": convergence.structural_identity,
    }

    return Lift(
        claim_name=claim_name,
        ceiling_before=current_ceiling,
        ceiling_after=ceiling_after,
        lift_amount=lift_amount,
        convergence=convergence,
        dampening=dampening,
        auth_ceiling_cap=auth_ceiling_cap,
        applied_at=applied_at,
        measurement_age_ms=measurement_age_ms,
        audit_trail=audit_trail,
    )


def transform_to_binding_axis(
    constraints: list[Constraint],
    *,
    threshold: float = 0.85,
) -> Constraint | None:
    """Atom 0018: identify the binding constraint — the axis closest
    to its budget cap.

    Returns the constraint with the highest utilization. None if the
    list is empty. When every constraint is below threshold, still
    returns the most-loaded one — the binding axis exists even when
    headroom is comfortable; this is what lets the caller measure
    "how close are we to budget exhaustion?"
    """
    if not constraints:
        return None
    return max(constraints, key=lambda c: c.utilization)


def _parse_iso_to_ms(iso: str) -> int:
    """Parse an ISO-8601 timestamp (with optional Z suffix) to epoch ms."""
    from datetime import datetime, timezone

    ts = iso.rstrip("Z")
    dt = datetime.fromisoformat(ts).replace(tzinfo=timezone.utc)
    return int(dt.timestamp() * 1000)
