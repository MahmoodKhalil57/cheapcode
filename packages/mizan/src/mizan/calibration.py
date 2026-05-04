"""mizan.calibration — train the dampening hyperparameter from
observed (lift_amount, falsifier_fired) outcomes.

Atom 0019 step 4 explicit: the dampening factor is calibrated against
falsifier-fire rates over time. As lifts accumulate observed outcomes,
this module fits the factor to keep falsifier-fire-rate at or below a
target threshold (default 0.20 per atom 0019).

Atom 0011 (smallest-distinguishing-experiment-first): each
(lift, observed) pair IS a tiny calibration experiment. The fit
accumulates them; the dampening trends toward a stable optimum.

The fit is intentionally simple — 1D linear interpolation between
{all-clean → loose} and {all-falsified → tight}. No scipy dependency
required (zero deps; substrate-suite stays portable).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Final, Literal

from mizan.energy import DEFAULT_DAMPENING

Posture = Literal["insufficient", "informative", "converged", "unstable"]


@dataclass(frozen=True)
class CalibrationResult:
    """Output of fit_dampening_from_outcomes.

    Carries the audit-trail components every consumer should log:
      - dampening: the recommended value to use
      - n_observations: how many (lift, outcome) pairs informed the fit
      - falsifier_fire_rate: empirical fire rate
      - posture: one of {insufficient, informative, converged, unstable}
    """

    dampening: float
    n_observations: int
    falsifier_fire_rate: float
    posture: Posture
    target_fire_rate: float
    notes: list[str]


# Bounds for the 1D fit. Atom 0019 step 4: dampening ∈ [0, 1].
TIGHT_DAMPENING: Final[float] = 0.05
"""Lower bound when every lift gets falsified — mizan should
near-stop lifting."""

LOOSE_DAMPENING: Final[float] = 0.85
"""Upper bound when zero lifts get falsified — mizan can lift
aggressively without exceeding the auth ladder."""

INSUFFICIENT_THRESHOLD: Final[int] = 3
"""Below this N, return DEFAULT + 'insufficient' posture."""

CONVERGED_THRESHOLD: Final[int] = 30
"""Above this N, posture 'converged' — fit is stable."""


def fit_dampening_from_outcomes(
    observations: list[tuple[float, bool]],
    *,
    target_fire_rate: float = 0.20,
) -> CalibrationResult:
    """Fit dampening from observed (lift_amount, falsifier_fired) pairs.

    Method: simple 1D linear interpolation. If observed fire rate ≤
    target, dampening is interpolated toward LOOSE. If above target,
    interpolated toward TIGHT. This is deliberately simple — atom
    0011 (smallest-distinguishing-experiment): the fit's job is to
    track empirical truth, not to be model-elegant.

    More sophisticated methods (Bayesian update, scipy.optimize) can
    layer on top in later versions; the simple-fit ships first.
    """
    notes: list[str] = []
    n = len(observations)

    if n == 0:
        return CalibrationResult(
            dampening=DEFAULT_DAMPENING,
            n_observations=0,
            falsifier_fire_rate=0.0,
            posture="insufficient",
            target_fire_rate=target_fire_rate,
            notes=["no observations — using DEFAULT_DAMPENING per atom 0019 step 4"],
        )

    fired = sum(1 for _, f in observations if f)
    fire_rate = fired / n

    # Interpolate dampening based on fire rate vs target.
    if fire_rate >= 1.0:
        dampening = TIGHT_DAMPENING
    elif fire_rate == 0.0:
        # Still apply a softer-than-LOOSE if N is small (we haven't
        # earned the right to fully relax).
        if n < INSUFFICIENT_THRESHOLD:
            dampening = (DEFAULT_DAMPENING + LOOSE_DAMPENING) / 2
            notes.append("zero falsifiers but small N; intermediate dampening")
        else:
            dampening = LOOSE_DAMPENING
    elif fire_rate <= target_fire_rate:
        # Below target: linear interp toward LOOSE.
        # frac = 0 at fire_rate=target, 1 at fire_rate=0
        frac = 1.0 - (fire_rate / target_fire_rate)
        dampening = DEFAULT_DAMPENING + frac * (LOOSE_DAMPENING - DEFAULT_DAMPENING)
    else:
        # Above target: linear interp toward TIGHT.
        # frac = 0 at fire_rate=target, 1 at fire_rate=1
        frac = (fire_rate - target_fire_rate) / (1.0 - target_fire_rate)
        dampening = DEFAULT_DAMPENING - frac * (DEFAULT_DAMPENING - TIGHT_DAMPENING)

    dampening = max(TIGHT_DAMPENING, min(LOOSE_DAMPENING, round(dampening, 4)))

    if n < INSUFFICIENT_THRESHOLD:
        posture: Posture = "insufficient"
        notes.append(f"only {n} observations; treat result as provisional")
    elif n >= CONVERGED_THRESHOLD:
        posture = "converged"
    else:
        posture = "informative"

    return CalibrationResult(
        dampening=dampening,
        n_observations=n,
        falsifier_fire_rate=round(fire_rate, 4),
        posture=posture,
        target_fire_rate=target_fire_rate,
        notes=notes,
    )
