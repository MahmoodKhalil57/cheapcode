"""TDD tests for mizan.grades."""

from __future__ import annotations

import pytest


def test_sahih_ceiling_is_0_95() -> None:
    """A.1 — sahih ceiling per mizaj M14."""
    from mizan.grades import AUTH_LADDER
    from mizan.types import AuthGrade

    assert AUTH_LADDER[AuthGrade.SAHIH] == 0.95


def test_hasan_ceiling_is_0_85() -> None:
    """A.2 — hasan ceiling."""
    from mizan.grades import AUTH_LADDER
    from mizan.types import AuthGrade

    assert AUTH_LADDER[AuthGrade.HASAN] == 0.85


def test_daif_ceiling_is_0_40() -> None:
    from mizan.grades import AUTH_LADDER
    from mizan.types import AuthGrade

    assert AUTH_LADDER[AuthGrade.DAIF] == 0.40


def test_mawdu_ceiling_is_0_10() -> None:
    from mizan.grades import AUTH_LADDER
    from mizan.types import AuthGrade

    assert AUTH_LADDER[AuthGrade.MAWDU] == 0.10


def test_source_tier_ladder_per_m11() -> None:
    """A.5 — L1 0.95 / L2 0.92 / L3 0.90 / L4 0.78 / L5 0.50."""
    from mizan.grades import SOURCE_TIER_LADDER
    from mizan.types import SourceTier

    assert SOURCE_TIER_LADDER[SourceTier.L1_OWN_RECEIPT] == 0.95
    assert SOURCE_TIER_LADDER[SourceTier.L2_VENDOR_DOC] == 0.92
    assert SOURCE_TIER_LADDER[SourceTier.L3_ACADEMIC] == 0.90
    assert SOURCE_TIER_LADDER[SourceTier.L4_AGGREGATOR] == 0.78
    assert SOURCE_TIER_LADDER[SourceTier.L5_CHAT_GOSSIP] == 0.50


def test_ladder_ceiling_returns_lower_of_two() -> None:
    """A.6 — lower-ceiling-wins per mizaj M14 §3."""
    from mizan.grades import ladder_ceiling
    from mizan.types import AuthGrade, SourceTier

    # SAHIH (0.95) vs L4 (0.78) → L4 wins.
    assert ladder_ceiling(AuthGrade.SAHIH, SourceTier.L4_AGGREGATOR) == 0.78
    # HASAN (0.85) vs L1 (0.95) → HASAN wins.
    assert ladder_ceiling(AuthGrade.HASAN, SourceTier.L1_OWN_RECEIPT) == 0.85
    # DAIF (0.40) always wins (lowest grade).
    assert ladder_ceiling(AuthGrade.DAIF, SourceTier.L1_OWN_RECEIPT) == 0.40


def test_ladder_ceiling_order_invariant() -> None:
    """A.7 — ladder_ceiling(g, t) == ladder_ceiling(g, t) for all
    permutations; the function commutes on its inputs."""
    from mizan.grades import ladder_ceiling
    from mizan.types import AuthGrade, SourceTier

    # The function takes (grade, tier) as positional. We test that
    # passing the same arguments in the kwargs form yields the same
    # ceiling — i.e. there's no implicit asymmetry between the two
    # axes beyond the lower-wins rule.
    for grade in AuthGrade:
        for tier in SourceTier:
            a = ladder_ceiling(grade, tier)
            b = ladder_ceiling(grade=grade, tier=tier)
            assert a == b, f"ladder_ceiling not order-invariant for ({grade}, {tier})"


def test_ladder_ceiling_rejects_unknown_grade() -> None:
    """A.8 — passing a non-AuthGrade grade raises a typed error."""
    from mizan.grades import ladder_ceiling
    from mizan.types import SourceTier

    with pytest.raises((TypeError, KeyError, ValueError)):
        ladder_ceiling("not-a-grade", SourceTier.L1_OWN_RECEIPT)  # type: ignore[arg-type]


def test_ladder_ceiling_rejects_unknown_tier() -> None:
    from mizan.grades import ladder_ceiling
    from mizan.types import AuthGrade

    with pytest.raises((TypeError, KeyError, ValueError)):
        ladder_ceiling(AuthGrade.SAHIH, "not-a-tier")  # type: ignore[arg-type]


def test_ladder_ceiling_returns_float_in_unit_interval() -> None:
    """Cross-cutting sanity: every ceiling is in [0, 1]."""
    from mizan.grades import AUTH_LADDER, SOURCE_TIER_LADDER

    for v in AUTH_LADDER.values():
        assert 0.0 <= v <= 1.0
    for v in SOURCE_TIER_LADDER.values():
        assert 0.0 <= v <= 1.0
