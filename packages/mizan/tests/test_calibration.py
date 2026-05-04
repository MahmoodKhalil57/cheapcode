"""TDD tests for mizan.calibration."""

from __future__ import annotations

import pytest


def test_fit_returns_dampening_in_unit_interval() -> None:
    """A.1 — output dampening ∈ [0, 1]."""
    from mizan.calibration import fit_dampening_from_outcomes

    obs = [(0.05, False), (0.03, True), (0.04, False)]
    result = fit_dampening_from_outcomes(obs)
    assert 0.0 <= result.dampening <= 1.0


def test_fit_tightens_when_all_falsifiers_fire() -> None:
    """A.2 — all lifts followed by falsifier fire → dampening near 0."""
    from mizan.calibration import fit_dampening_from_outcomes

    # Every lift had a falsifier fire — mizan should stop lifting.
    obs = [(0.05, True)] * 20
    result = fit_dampening_from_outcomes(obs)
    assert result.dampening < 0.3, f"expected tight dampening; got {result.dampening}"


def test_fit_loosens_when_no_falsifiers_fire() -> None:
    """A.3 — clean dataset → dampening near upper bound."""
    from mizan.calibration import fit_dampening_from_outcomes

    obs = [(0.05, False)] * 20
    result = fit_dampening_from_outcomes(obs)
    assert result.dampening > 0.6, f"expected loose dampening; got {result.dampening}"


def test_fit_returns_default_on_empty_with_insufficient_posture() -> None:
    """A.4 — empty dataset → DEFAULT dampening + 'insufficient' posture."""
    from mizan.calibration import fit_dampening_from_outcomes
    from mizan.energy import DEFAULT_DAMPENING

    result = fit_dampening_from_outcomes([])
    assert result.dampening == DEFAULT_DAMPENING
    assert result.posture == "insufficient"
    assert result.n_observations == 0


def test_fit_typed_output_has_required_fields() -> None:
    """A.5 — CalibrationResult has dampening + n_observations + rate + posture."""
    from mizan.calibration import fit_dampening_from_outcomes

    obs = [(0.05, False), (0.03, True)]
    r = fit_dampening_from_outcomes(obs)
    assert hasattr(r, "dampening")
    assert hasattr(r, "n_observations")
    assert hasattr(r, "falsifier_fire_rate")
    assert hasattr(r, "posture")
    assert r.n_observations == 2
    assert 0.0 <= r.falsifier_fire_rate <= 1.0


def test_fit_partial_falsifier_rate_intermediate_dampening() -> None:
    """50% falsifier rate → dampening somewhere in [0.2, 0.6]."""
    from mizan.calibration import fit_dampening_from_outcomes

    obs = [(0.05, True if i % 2 == 0 else False) for i in range(20)]
    r = fit_dampening_from_outcomes(obs)
    assert 0.1 < r.dampening < 0.7, f"expected intermediate; got {r.dampening}"
    assert abs(r.falsifier_fire_rate - 0.5) < 0.05


def test_fit_target_falsifier_threshold_configurable() -> None:
    """target_fire_rate can be set; defaults to 0.20 per atom 0019 step 4."""
    from mizan.calibration import fit_dampening_from_outcomes

    obs = [(0.05, False)] * 10  # all clean
    r = fit_dampening_from_outcomes(obs, target_fire_rate=0.20)
    # With 0% observed fire rate vs 20% target, dampening loose.
    assert r.dampening > 0.5


def test_calibration_audit_serializable() -> None:
    """Result can be turned into a dict for audit-trail logging."""
    from mizan.calibration import fit_dampening_from_outcomes
    from dataclasses import asdict

    r = fit_dampening_from_outcomes([(0.05, False), (0.03, True)])
    d = asdict(r)
    assert "dampening" in d
    assert "posture" in d
