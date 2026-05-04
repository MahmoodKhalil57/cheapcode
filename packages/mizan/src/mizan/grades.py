"""mizan.grades — auth-grade ladder (mizaj M14) + source-tier ladder
(mizaj M11). The two binding ladders for confidence ceilings.

Lower-ceiling-wins on multi-cite (M14 §3); ladder_ceiling() implements
this as the primary public API. Strict-typed: passing an unknown grade
or tier raises immediately rather than silently defaulting (atom 0007 —
unknown inputs cannot pass through and inflate confidence).
"""

from __future__ import annotations

from typing import Final

from mizan.types import AuthGrade, SourceTier

# ─── M14 — auth-grade ladder ─────────────────────────────────────────

AUTH_LADDER: Final[dict[AuthGrade, float]] = {
    AuthGrade.SAHIH: 0.95,   # verified isnad — top tier
    AuthGrade.HASAN: 0.85,   # acceptable, one weakness
    AuthGrade.DAIF: 0.40,    # weak chain, retain for audit
    AuthGrade.MAWDU: 0.10,   # fabricated, retain as anti-pattern
}

# ─── M11 — source-tier ladder ────────────────────────────────────────

SOURCE_TIER_LADDER: Final[dict[SourceTier, float]] = {
    SourceTier.L1_OWN_RECEIPT: 0.95,
    SourceTier.L2_VENDOR_DOC:  0.92,
    SourceTier.L3_ACADEMIC:    0.90,
    SourceTier.L4_AGGREGATOR:  0.78,
    SourceTier.L5_CHAT_GOSSIP: 0.50,
}


def ladder_ceiling(grade: AuthGrade, tier: SourceTier) -> float:
    """Return the lower of the two ladder ceilings.

    Mizaj M14 §3: when a claim cites multiple sources, the LOWER
    ceiling wins. When grade and tier disagree, the conservative
    bound is the floor of both — never the higher.

    Raises:
        KeyError if `grade` is not an AuthGrade member.
        KeyError if `tier` is not a SourceTier member.
    """
    if not isinstance(grade, AuthGrade):
        raise KeyError(f"unknown auth grade: {grade!r} (expected AuthGrade member)")
    if not isinstance(tier, SourceTier):
        raise KeyError(f"unknown source tier: {tier!r} (expected SourceTier member)")
    return min(AUTH_LADDER[grade], SOURCE_TIER_LADDER[tier])
