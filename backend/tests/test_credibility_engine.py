"""
Comprehensive unit tests for the CredibilityEngine.

Tests each of the 8 scoring components independently, verifies determinism,
temporal contradiction handling, freshness decay, domain trust rankings,
weight overrides, and edge cases.

Run:
    cd /home/ritesh/Desktop/Credify/backend
    python -m pytest tests/test_credibility_engine.py -v
"""

import re
import inspect
from datetime import datetime, timezone, timedelta

import pytest

# ---------- Setup sys.path so imports work from the tests directory ----------
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.models.fact_check import Evidence, CredibilityScoreResult
from app.tools.scoring.credibility_engine import CredibilityEngine, DEFAULT_WEIGHTS


# ─── Helpers ──────────────────────────────────────────────────────────────────

REF_TIME = datetime(2026, 3, 22, tzinfo=timezone.utc)


def _make_evidence(
    url: str = "https://example.com/article",
    source: str = "Example",
    snippet: str = "Test article about climate change policies in 2026.",
    content: str = "Test article about climate change policies in 2026.",
    published_at: str | None = "2026-03-21T12:00:00Z",
    domain_age_days: int = 1000,
    words_count: int = 100,
    number_of_numbers: int = 5,
    number_of_links: int = 2,
    tld: str = ".com",
    is_https: bool = True,
    author: str | None = "John Smith",
) -> Evidence:
    return Evidence(
        source=source,
        url=url,
        content=content,
        snippet=snippet,
        published_at=published_at,
        domain_age_days=domain_age_days,
        words_count=words_count,
        number_of_numbers=number_of_numbers,
        number_of_links=number_of_links,
        tld=tld,
        is_https=is_https,
        author=author,
    )


# ─── 1. Determinism Test ─────────────────────────────────────────────────────

class TestDeterminism:
    """Same input must always produce the exact same output."""

    def test_identical_runs_produce_identical_output(self):
        ev = _make_evidence()
        all_ev = [ev, _make_evidence(url="https://reuters.com/other", source="Reuters")]

        r1 = CredibilityEngine.compute_score(ev, all_ev, reference_time=REF_TIME)
        r2 = CredibilityEngine.compute_score(ev, all_ev, reference_time=REF_TIME)

        assert r1.final_score == r2.final_score
        assert r1.components == r2.components
        assert r1.is_outdated == r2.is_outdated
        assert r1.reasoning == r2.reasoning

    def test_no_random_in_source(self):
        """Grep the engine source file for any usage of random."""
        src_file = os.path.join(
            os.path.dirname(__file__),
            "..",
            "app",
            "tools",
            "scoring",
            "credibility_engine.py",
        )
        with open(src_file, "r") as f:
            source = f.read()

        # Must NOT import or use random
        assert "import random" not in source, "Engine must not import random"
        assert "random." not in source, "Engine must not call random functions"


# ─── 2. Domain Trust Score ────────────────────────────────────────────────────

class TestDomainTrust:
    def test_trusted_domain_scores_higher(self):
        trusted = _make_evidence(url="https://reuters.com/article")
        unknown = _make_evidence(url="https://unknowndomain.xyz/article", tld=".xyz")

        t_score = CredibilityEngine._domain_trust_score(trusted)
        u_score = CredibilityEngine._domain_trust_score(unknown)

        assert t_score > u_score, "Trusted domain should score higher"

    def test_suspicious_domain_scores_low(self):
        suspicious = _make_evidence(
            url="http://infowars.com/article",
            domain_age_days=50,
            is_https=False,
            tld=".com",
        )
        score = CredibilityEngine._domain_trust_score(suspicious)
        assert score < 0.5, f"Suspicious domain should score below 0.5, got {score}"

    def test_gov_tld_beats_com(self):
        gov = _make_evidence(url="https://health.gov/report", tld=".gov")
        com = _make_evidence(url="https://healthsite.com/report", tld=".com")

        assert CredibilityEngine._domain_trust_score(gov) > CredibilityEngine._domain_trust_score(com)

    def test_https_bonus(self):
        https = _make_evidence(is_https=True)
        http = _make_evidence(is_https=False)

        assert CredibilityEngine._domain_trust_score(https) >= CredibilityEngine._domain_trust_score(http)

    def test_domain_age_log_scale(self):
        young = _make_evidence(domain_age_days=10)
        old = _make_evidence(domain_age_days=5000)

        assert CredibilityEngine._domain_trust_score(old) > CredibilityEngine._domain_trust_score(young)


# ─── 3. Author Authority ─────────────────────────────────────────────────────

class TestAuthorAuthority:
    def test_full_name_author(self):
        ev = _make_evidence(author="Jane Doe")
        assert CredibilityEngine._author_authority_score(ev) == 0.8

    def test_single_name_author(self):
        ev = _make_evidence(author="Reuters")
        assert CredibilityEngine._author_authority_score(ev) == 0.6

    def test_no_author(self):
        ev = _make_evidence(author=None)
        assert CredibilityEngine._author_authority_score(ev) == 0.4


# ─── 4. Content Quality ──────────────────────────────────────────────────────

class TestContentQuality:
    def test_rich_content_scores_higher(self):
        rich = _make_evidence(
            content="According to a 2026 study by Harvard, 42% of... (reference: source)",
            words_count=200,
            number_of_numbers=10,
            number_of_links=3,
        )
        shallow = _make_evidence(
            content="Something happened.",
            words_count=5,
            number_of_numbers=0,
            number_of_links=0,
        )
        assert CredibilityEngine._content_quality_score(rich) > CredibilityEngine._content_quality_score(shallow)

    def test_word_count_not_primary_signal(self):
        """A long but shallow text should NOT score much higher than a shorter specific one."""
        long_shallow = _make_evidence(
            content="blah " * 500,
            words_count=500,
            number_of_numbers=0,
            number_of_links=0,
        )
        short_specific = _make_evidence(
            content="In a 2026 report, the WHO found 37% reduction. Source: https://who.int/report",
            words_count=50,
            number_of_numbers=5,
            number_of_links=1,
        )
        # Short specific should score at least as well as long shallow
        long_score = CredibilityEngine._content_quality_score(long_shallow)
        short_score = CredibilityEngine._content_quality_score(short_specific)
        assert short_score >= long_score * 0.8, "Word count alone should not dominate"


# ─── 5. Freshness Score ──────────────────────────────────────────────────────

class TestFreshness:
    def test_today_scores_highest(self):
        today = _make_evidence(published_at="2026-03-22T00:00:00Z")
        score = CredibilityEngine._freshness_score(today, REF_TIME)
        assert score > 0.9, f"Today's evidence should score >0.9, got {score}"

    def test_old_evidence_scores_low(self):
        old = _make_evidence(published_at="2025-01-01T00:00:00Z")
        score = CredibilityEngine._freshness_score(old, REF_TIME)
        assert score < 0.3, f"Evidence from 14+ months ago should score <0.3, got {score}"

    def test_unknown_timestamp_is_neutral(self):
        ev = _make_evidence(published_at=None)
        score = CredibilityEngine._freshness_score(ev, REF_TIME)
        assert score == 0.5, "Unknown timestamp should return neutral 0.5"

    def test_exponential_decay(self):
        """Score should decrease monotonically with age."""
        scores = []
        for days_ago in [0, 7, 30, 90, 180, 365]:
            ts = (REF_TIME - timedelta(days=days_ago)).isoformat()
            ev = _make_evidence(published_at=ts)
            scores.append(CredibilityEngine._freshness_score(ev, REF_TIME))

        for i in range(len(scores) - 1):
            assert scores[i] >= scores[i + 1], (
                f"Freshness should decay: day {i} score {scores[i]} < day {i+1} score {scores[i+1]}"
            )


# ─── 6. Cross-Source Agreement ────────────────────────────────────────────────

class TestAgreement:
    def test_single_evidence_is_neutral(self):
        ev = _make_evidence()
        score = CredibilityEngine._agreement_score(ev, [ev])
        assert score == 0.5

    def test_agreement_from_independent_sources(self):
        ev1 = _make_evidence(
            url="https://reuters.com/article1",
            snippet="Climate change policies strengthen in 2026",
        )
        ev2 = _make_evidence(
            url="https://bbc.com/article2",
            snippet="Climate change policies strengthen in 2026",
            source="BBC",
        )
        ev3 = _make_evidence(
            url="https://nytimes.com/article3",
            snippet="Climate change policies strengthen in 2026",
            source="NYT",
        )
        all_ev = [ev1, ev2, ev3]
        score = CredibilityEngine._agreement_score(ev1, all_ev)
        assert score > 0.6, f"Multiple agreeing independent sources should boost score, got {score}"

    def test_same_domain_not_counted(self):
        ev1 = _make_evidence(url="https://example.com/a1", snippet="fact A confirmed")
        ev2 = _make_evidence(url="https://example.com/a2", snippet="fact A confirmed")
        all_ev = [ev1, ev2]
        score = CredibilityEngine._agreement_score(ev1, all_ev)
        # Same domain → not independent agreement
        assert score <= 0.5


# ─── 7. Source Diversity ──────────────────────────────────────────────────────

class TestDiversity:
    def test_diverse_pool_scores_higher(self):
        ev1 = _make_evidence(url="https://reuters.com/a")
        ev2 = _make_evidence(url="https://bbc.com/b")
        ev3 = _make_evidence(url="https://nytimes.com/c")
        all_diverse = [ev1, ev2, ev3]

        ev4 = _make_evidence(url="https://example.com/a")
        ev5 = _make_evidence(url="https://example.com/b")
        ev6 = _make_evidence(url="https://example.com/c")
        all_same = [ev4, ev5, ev6]

        diverse_score = CredibilityEngine._diversity_score(ev1, all_diverse)
        same_score = CredibilityEngine._diversity_score(ev4, all_same)

        assert diverse_score > same_score


# ─── 8. Temporal Contradiction Handling ───────────────────────────────────────

class TestTemporalContradiction:
    def test_newer_trusted_source_penalises_older(self):
        """If a newer high-trust source contradicts an older one, the older
        evidence should receive a contradiction penalty."""
        old_ev = _make_evidence(
            url="https://unknowndomain.biz/old",
            snippet="The earth is flat according to ancient maps",
            content="The earth is flat according to ancient maps",
            published_at="2024-01-01T00:00:00Z",
            tld=".biz",
            is_https=False,
            author=None,
            domain_age_days=100,
        )
        new_ev = _make_evidence(
            url="https://reuters.com/new",
            snippet="NASA confirms round earth with new satellite imagery in 2026",
            content="NASA confirms round earth with new satellite imagery in 2026",
            published_at="2026-03-20T12:00:00Z",
            tld=".com",
            is_https=True,
            author="John Smith",
            domain_age_days=5000,
        )
        all_ev = [old_ev, new_ev]

        penalty = CredibilityEngine._contradiction_penalty(old_ev, all_ev, REF_TIME)
        assert penalty > 0, "Old contradicted evidence should receive a penalty"

    def test_temporal_consistency_rewards_recent_consensus(self):
        """Recent evidence aligned with other recent evidence → high consistency."""
        ev1 = _make_evidence(
            url="https://reuters.com/a",
            snippet="Study confirms vaccine safety in 2026 trial results",
            published_at="2026-03-20T00:00:00Z",
        )
        ev2 = _make_evidence(
            url="https://bbc.com/b",
            snippet="Study confirms vaccine safety in 2026 trial results",
            published_at="2026-03-21T00:00:00Z",
        )
        all_ev = [ev1, ev2]

        score = CredibilityEngine._temporal_consistency_score(ev1, all_ev, REF_TIME)
        assert score >= 0.5, f"Recent aligned evidence should have good temporal consistency, got {score}"

    def test_outdated_evidence_flagged(self):
        """Evidence that is old and misaligned should be flagged as outdated."""
        old = _make_evidence(published_at="2023-06-01T00:00:00Z")
        recent = _make_evidence(
            url="https://other.com/new",
            published_at="2026-03-21T00:00:00Z",
        )
        all_ev = [old, recent]

        result = CredibilityEngine.compute_score(old, all_ev, reference_time=REF_TIME)
        # With such an old timestamp, freshness should be very low → is_outdated = True
        assert result.is_outdated is True, (
            f"Very old evidence should be flagged outdated. "
            f"Freshness={result.components['freshness']}, "
            f"Temporal={result.components['temporal_consistency']}"
        )


# ─── 9. Weight Override Test ─────────────────────────────────────────────────

class TestWeightOverride:
    def test_custom_weights_change_final_score(self):
        ev = _make_evidence()
        all_ev = [ev]

        default = CredibilityEngine.compute_score(ev, all_ev, reference_time=REF_TIME)
        custom = CredibilityEngine.compute_score(
            ev,
            all_ev,
            weights={"freshness": 0.50, "domain_trust": 0.05},
            reference_time=REF_TIME,
        )

        assert default.final_score != custom.final_score, (
            "Custom weights should produce a different final score"
        )


# ─── 10. Output Structure ────────────────────────────────────────────────────

class TestOutputStructure:
    def test_all_components_present(self):
        ev = _make_evidence()
        result = CredibilityEngine.compute_score(ev, [ev], reference_time=REF_TIME)

        expected_keys = {
            "domain_trust", "author_authority", "content_quality",
            "agreement", "freshness", "diversity",
            "temporal_consistency", "contradiction_penalty",
        }
        assert set(result.components.keys()) == expected_keys

    def test_final_score_in_range(self):
        ev = _make_evidence()
        result = CredibilityEngine.compute_score(ev, [ev], reference_time=REF_TIME)
        assert 0.0 <= result.final_score <= 1.0

    def test_all_components_in_range(self):
        ev = _make_evidence()
        result = CredibilityEngine.compute_score(ev, [ev], reference_time=REF_TIME)
        for key, val in result.components.items():
            assert 0.0 <= val <= 1.0, f"Component {key} out of range: {val}"

    def test_reasoning_is_nonempty(self):
        ev = _make_evidence()
        result = CredibilityEngine.compute_score(ev, [ev], reference_time=REF_TIME)
        assert isinstance(result.reasoning, str)
        assert len(result.reasoning) > 0


# ─── 11. Edge Cases ──────────────────────────────────────────────────────────

class TestEdgeCases:
    def test_empty_evidence_list(self):
        ev = _make_evidence()
        result = CredibilityEngine.compute_score(ev, [], reference_time=REF_TIME)
        assert 0.0 <= result.final_score <= 1.0

    def test_evidence_with_no_metadata(self):
        ev = Evidence(
            source="Unknown",
            url="http://example.com",
            content="just some text",
            snippet="just some text",
        )
        result = CredibilityEngine.compute_score(ev, [ev], reference_time=REF_TIME)
        assert 0.0 <= result.final_score <= 1.0

    def test_single_evidence_item(self):
        ev = _make_evidence()
        result = CredibilityEngine.compute_score(ev, [ev], reference_time=REF_TIME)
        assert 0.0 <= result.final_score <= 1.0
        assert result.components["agreement"] == 0.5  # Single item → neutral
        assert result.components["diversity"] == 0.5   # Single item → neutral
