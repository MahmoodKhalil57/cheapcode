"""TDD tests for mizan.convergence."""

from __future__ import annotations

from pathlib import Path

import pytest


def _make_witness(file_path: str, methodology: str = "deterministic-test"):
    from mizan.types import Witness, AuthGrade, SourceTier, utc_now_iso
    return Witness(
        file_path=file_path,
        methodology_class=methodology,
        measured_at=utc_now_iso(),
        auth_grade=AuthGrade.HASAN,
        source_tier=SourceTier.L1_OWN_RECEIPT,
    )


def test_citation_graph_score_no_intercitation(tmp_path: Path) -> None:
    """A.1 — N=2 files with NO references between them → 1.0."""
    from mizan.convergence import citation_graph_score

    f1 = tmp_path / "01-pilot.bn"
    f2 = tmp_path / "02-scorer.bn"
    f1.write_text("claim x: Bool = True\n")
    f2.write_text("claim y: Bool = True\n")
    score = citation_graph_score([f1, f2])
    assert score == 1.0


def test_citation_graph_score_mutual_citation(tmp_path: Path) -> None:
    """A.2 — mutual citation → 0.0."""
    from mizan.convergence import citation_graph_score

    f1 = tmp_path / "01-pilot.bn"
    f2 = tmp_path / "02-scorer.bn"
    # Each file references the other's stem.
    f1.write_text("# refers to 02-scorer.bn for evidence\n")
    f2.write_text("# refers to 01-pilot.bn for evidence\n")
    score = citation_graph_score([f1, f2])
    assert score == 0.0


def test_citation_graph_score_single_file(tmp_path: Path) -> None:
    """A.3 — N=1 → 0.0 (no convergence possible)."""
    from mizan.convergence import citation_graph_score

    f1 = tmp_path / "01-pilot.bn"
    f1.write_text("claim x: Bool = True")
    assert citation_graph_score([f1]) == 0.0


def test_methodology_axis_score_distinct() -> None:
    """A.4 — all distinct methodologies → 1.0."""
    from mizan.convergence import methodology_axis_score

    ws = [
        _make_witness("/a.bn", "human-pilot"),
        _make_witness("/b.bn", "deterministic-test"),
        _make_witness("/c.bn", "runtime-scorer"),
    ]
    assert methodology_axis_score(ws) == 1.0


def test_methodology_axis_score_all_same() -> None:
    """A.5 — all same methodology → ≤ 0.5."""
    from mizan.convergence import methodology_axis_score

    ws = [_make_witness(f"/f{i}.bn", "deterministic-test") for i in range(3)]
    score = methodology_axis_score(ws)
    assert score <= 0.5, f"expected ≤0.5 for same methodology; got {score}"


def test_methodology_axis_score_partial_distinct() -> None:
    """Two distinct + one repeat across 3 = 2/3 axes."""
    from mizan.convergence import methodology_axis_score

    ws = [
        _make_witness("/a.bn", "human-pilot"),
        _make_witness("/b.bn", "deterministic-test"),
        _make_witness("/c.bn", "deterministic-test"),
    ]
    score = methodology_axis_score(ws)
    assert 0.5 < score < 1.0, f"expected (0.5, 1.0); got {score}"


def test_structural_identity_score_bounded() -> None:
    """A.6 — bounded [0, 1] across all inputs."""
    from mizan.convergence import structural_identity_score

    score = structural_identity_score("test_claim", file_texts={})
    assert 0.0 <= score <= 1.0


def test_detect_convergence_full_measurement(tmp_path: Path) -> None:
    """A.7 — detect_convergence returns a populated measurement."""
    from mizan.convergence import detect_convergence

    f1 = tmp_path / "01-pilot.bn"
    f2 = tmp_path / "02-scorer.bn"
    f1.write_text("claim test_claim: Bool @>=0.85 = True")
    f2.write_text("claim test_claim_supports: Bool @>=0.85 = True")

    ws = [
        _make_witness(str(f1), "human-pilot"),
        _make_witness(str(f2), "deterministic-test"),
    ]
    cm = detect_convergence("test_claim", witnesses=ws)
    assert cm.claim_name == "test_claim"
    assert cm.measured_at  # populated
    assert cm.wall_clock_ms >= 0
    assert 0.0 <= cm.citation_graph_sub <= 1.0
    assert 0.0 <= cm.methodology_axis_sub <= 1.0
    assert 0.0 <= cm.temporal_gap_sub <= 1.0
    assert 0.0 <= cm.structural_identity <= 1.0


def test_detect_convergence_empty_witnesses() -> None:
    """A.8 — empty witness list returns zero-energy measurement, no raise."""
    from mizan.convergence import detect_convergence

    cm = detect_convergence("test_claim", witnesses=[])
    assert cm.convergence_energy == 0.0
    assert cm.claim_name == "test_claim"


def test_independence_score_geometric_mean() -> None:
    """independence_score is geometric mean of three sub-scores."""
    from mizan.convergence import independence_score

    # All 1.0 → 1.0
    assert independence_score(1.0, 1.0, 1.0) == 1.0
    # 0.5 × 0.5 × 0.5 → 0.5
    assert abs(independence_score(0.5, 0.5, 0.5) - 0.5) < 1e-6
    # Any 0 → 0 (zero-product geometric mean)
    assert independence_score(1.0, 1.0, 0.0) == 0.0


def test_temporal_gap_score_same_session_low(tmp_path: Path) -> None:
    """Same-day witnesses → temporal_gap_sub ≤ 0.5."""
    from mizan.convergence import detect_convergence
    from mizan.types import Witness, AuthGrade, SourceTier

    same_day = "2026-05-03T10:00:00.000Z"
    ws = [
        Witness(file_path="/a.bn", methodology_class="m1",
                measured_at=same_day, auth_grade=AuthGrade.HASAN,
                source_tier=SourceTier.L1_OWN_RECEIPT),
        Witness(file_path="/b.bn", methodology_class="m2",
                measured_at=same_day, auth_grade=AuthGrade.HASAN,
                source_tier=SourceTier.L1_OWN_RECEIPT),
    ]
    cm = detect_convergence("test", witnesses=ws)
    assert cm.temporal_gap_sub <= 0.5


def test_temporal_gap_score_distant_witnesses_high() -> None:
    """≥7 days apart → temporal_gap_sub ≥ 0.85."""
    from mizan.convergence import detect_convergence
    from mizan.types import Witness, AuthGrade, SourceTier

    ws = [
        Witness(file_path="/a.bn", methodology_class="m1",
                measured_at="2026-04-18T10:00:00.000Z",
                auth_grade=AuthGrade.HASAN, source_tier=SourceTier.L1_OWN_RECEIPT),
        Witness(file_path="/b.bn", methodology_class="m2",
                measured_at="2026-05-03T10:00:00.000Z",
                auth_grade=AuthGrade.HASAN, source_tier=SourceTier.L1_OWN_RECEIPT),
    ]
    cm = detect_convergence("test", witnesses=ws)
    assert cm.temporal_gap_sub >= 0.85
