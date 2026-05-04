"""TDD tests for mizan.energy."""

from __future__ import annotations

import pytest


def _make_convergence(
    *,
    independence_subs: tuple[float, float, float] = (1.0, 1.0, 1.0),
    structural_identity: float = 0.7,
):
    """Helper: build a ConvergenceMeasurement with the desired sub-scores."""
    from mizan.types import ConvergenceMeasurement, Witness, AuthGrade, SourceTier, utc_now_iso

    return ConvergenceMeasurement(
        claim_name="test_claim",
        witnesses=[
            Witness(file_path=f"/fake/f{i}.bn", methodology_class=f"m{i}",
                    measured_at=utc_now_iso(), auth_grade=AuthGrade.HASAN,
                    source_tier=SourceTier.L1_OWN_RECEIPT)
            for i in range(2)
        ],
        citation_graph_sub=independence_subs[0],
        methodology_axis_sub=independence_subs[1],
        temporal_gap_sub=independence_subs[2],
        structural_identity=structural_identity,
        measured_at=utc_now_iso(),
        wall_clock_ms=10,
    )


def test_lift_never_exceeds_auth_ceiling() -> None:
    """A.1 — lift is bounded by ceiling_distance × convergence_energy."""
    from mizan.energy import lift_via_convergence, AUTH_CEILING_CAP

    conv = _make_convergence(independence_subs=(1.0, 1.0, 1.0), structural_identity=1.0)
    lift = lift_via_convergence(
        claim_name="test", current_ceiling=0.5, convergence=conv, dampening=1.0,
    )
    assert lift.ceiling_after <= AUTH_CEILING_CAP, \
        f"ceiling_after {lift.ceiling_after} exceeded cap {AUTH_CEILING_CAP}"


def test_lift_at_unit_confidence_is_zero() -> None:
    """A.2 — no headroom → no lift."""
    from mizan.energy import lift_via_convergence

    conv = _make_convergence()
    lift = lift_via_convergence(
        claim_name="test", current_ceiling=0.95, convergence=conv,
    )
    assert lift.lift_amount == 0.0


def test_lift_with_zero_convergence_energy_is_zero() -> None:
    """A.3 — convergence_energy = 0 → lift = 0."""
    from mizan.energy import lift_via_convergence

    conv = _make_convergence(independence_subs=(0.0, 1.0, 1.0))
    lift = lift_via_convergence(
        claim_name="test", current_ceiling=0.5, convergence=conv,
    )
    assert lift.lift_amount == 0.0
    assert lift.ceiling_after == 0.5


def test_lift_with_zero_dampening_is_zero() -> None:
    """A.4 — dampening = 0 → lift = 0."""
    from mizan.energy import lift_via_convergence

    conv = _make_convergence()
    lift = lift_via_convergence(
        claim_name="test", current_ceiling=0.5, convergence=conv, dampening=0.0,
    )
    assert lift.lift_amount == 0.0


def test_lift_carries_full_audit_trail() -> None:
    """A.5 — every Lift has ceiling_before, ceiling_after, lift_amount,
    convergence input, dampening, auth_ceiling_cap, applied_at."""
    from mizan.energy import lift_via_convergence

    conv = _make_convergence()
    lift = lift_via_convergence(
        claim_name="test", current_ceiling=0.5, convergence=conv, dampening=0.5,
    )
    assert lift.ceiling_before == 0.5
    assert lift.ceiling_after >= 0.5
    assert lift.lift_amount >= 0.0
    assert lift.convergence is conv
    assert lift.dampening == 0.5
    assert lift.auth_ceiling_cap > 0
    assert lift.applied_at  # ISO timestamp populated


def test_lift_records_measurement_staleness() -> None:
    """A.6 — Lift.measurement_age_ms is populated and ≥ 0."""
    from mizan.energy import lift_via_convergence

    conv = _make_convergence()
    lift = lift_via_convergence(
        claim_name="test", current_ceiling=0.5, convergence=conv,
    )
    assert lift.measurement_age_ms >= 0


def test_lift_idempotent_safe_recomputes_distance() -> None:
    """A.7 — applying twice: second lift uses NEW ceiling as basis."""
    from mizan.energy import lift_via_convergence

    conv = _make_convergence(independence_subs=(1.0, 1.0, 1.0), structural_identity=0.7)
    lift1 = lift_via_convergence(
        claim_name="t", current_ceiling=0.5, convergence=conv, dampening=0.5,
    )
    lift2 = lift_via_convergence(
        claim_name="t", current_ceiling=lift1.ceiling_after, convergence=conv, dampening=0.5,
    )
    # Second lift should be smaller than first (less ceiling distance left).
    assert lift2.lift_amount <= lift1.lift_amount + 1e-9
    assert lift2.ceiling_before == lift1.ceiling_after


def test_transform_to_binding_axis_picks_most_loaded() -> None:
    """A.8 — binding constraint = highest-utilization axis."""
    from mizan.energy import transform_to_binding_axis
    from mizan.types import Constraint

    cs = [
        Constraint(name="wall", current=10, budget_cap=100, units="s"),
        Constraint(name="usd",  current=80, budget_cap=100, units="$"),
        Constraint(name="tok",  current=20, budget_cap=100, units="tok"),
    ]
    binding = transform_to_binding_axis(cs)
    assert binding is not None
    assert binding.name == "usd"


def test_transform_to_binding_axis_handles_empty() -> None:
    """Edge case: no constraints → None."""
    from mizan.energy import transform_to_binding_axis

    assert transform_to_binding_axis([]) is None


def test_lift_formula_arithmetic_correctness() -> None:
    """Arithmetic check: lift = independence × struct × dist × dampening."""
    from mizan.energy import lift_via_convergence, AUTH_CEILING_CAP

    # All sub-scores 1.0 → independence (geometric mean) = 1.0
    # struct = 0.5, current = 0.6, dampening = 0.5
    # ceiling_distance = 0.95 - 0.6 = 0.35
    # convergence_energy = 1.0 × 0.5 = 0.5
    # lift = 0.5 × 0.35 × 0.5 = 0.0875
    conv = _make_convergence(independence_subs=(1.0, 1.0, 1.0), structural_identity=0.5)
    lift = lift_via_convergence(
        claim_name="t", current_ceiling=0.6, convergence=conv, dampening=0.5,
    )
    assert abs(lift.lift_amount - 0.0875) < 1e-6, \
        f"expected 0.0875, got {lift.lift_amount}"
    assert abs(lift.ceiling_after - 0.6875) < 1e-6
