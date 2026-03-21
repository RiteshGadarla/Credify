"""
Credibility Engine — Multi-Dimensional, Temporal-Aware Scoring

Computes a credibility score (0–1) for each evidence item using 8 independent
scoring components with configurable weighted aggregation. Fully deterministic:
same input always produces the same output. No randomness anywhere.

Components:
  1. Domain Trust Score
  2. Author Authority Score
  3. Content Quality Score
  4. Cross-Source Agreement Score
  5. Freshness Score (exponential decay)
  6. Source Diversity Score
  7. Temporal Consistency Score
  8. Contradiction Penalty
"""

import math
import re
from datetime import datetime, timezone
from typing import Dict, List, Optional, Set, Tuple
from urllib.parse import urlparse

from app.models.fact_check import CredibilityScoreResult, Evidence
from app.tools.scoring.domain_trust_data import (
    SUSPICIOUS_DOMAINS,
    TLD_DEFAULT_SCORE,
    TLD_TRUST_SCORES,
    TRUSTED_DOMAINS,
)


# ─── Default Weights ──────────────────────────────────────────────────────────
DEFAULT_WEIGHTS: Dict[str, float] = {
    "domain_trust": 0.15,
    "author_authority": 0.10,
    "content_quality": 0.15,
    "agreement": 0.15,
    "freshness": 0.20,       # Highest — recency is critical
    "diversity": 0.10,
    "temporal_consistency": 0.10,
    "contradiction_penalty": 0.15,
}

# Reference time — frozen per engine invocation so all items in a batch share
# the same baseline.  Callers may override via the `reference_time` arg.
_FALLBACK_REFERENCE_TIME = datetime(2026, 3, 22, tzinfo=timezone.utc)


class CredibilityEngine:
    """
    Deterministic, explainable credibility scoring engine.

    Public API
    ----------
    compute_score(evidence, all_evidence, *, weights, reference_time)
        → CredibilityScoreResult
    """

    # ── Public entry point ────────────────────────────────────────────────

    @staticmethod
    def compute_score(
        evidence: Evidence,
        all_evidence: List[Evidence],
        *,
        weights: Optional[Dict[str, float]] = None,
        reference_time: Optional[datetime] = None,
    ) -> CredibilityScoreResult:
        """
        Compute a credibility score for *evidence* in the context of
        *all_evidence*.  Returns a structured result with component breakdown
        and reasoning.
        """
        w = {**DEFAULT_WEIGHTS, **(weights or {})}
        ref_time = reference_time or _FALLBACK_REFERENCE_TIME

        # ── Compute each component independently ──────────────────────
        domain_trust = CredibilityEngine._domain_trust_score(evidence)
        author_authority = CredibilityEngine._author_authority_score(evidence)
        content_quality = CredibilityEngine._content_quality_score(evidence)
        agreement = CredibilityEngine._agreement_score(evidence, all_evidence)
        freshness = CredibilityEngine._freshness_score(evidence, ref_time)
        diversity = CredibilityEngine._diversity_score(evidence, all_evidence)
        temporal_consistency = CredibilityEngine._temporal_consistency_score(
            evidence, all_evidence, ref_time
        )
        contradiction_penalty = CredibilityEngine._contradiction_penalty(
            evidence, all_evidence, ref_time
        )

        # ── Weighted aggregation ──────────────────────────────────────
        raw_score = (
            w["domain_trust"] * domain_trust
            + w["author_authority"] * author_authority
            + w["content_quality"] * content_quality
            + w["agreement"] * agreement
            + w["freshness"] * freshness
            + w["diversity"] * diversity
            + w["temporal_consistency"] * temporal_consistency
            - w["contradiction_penalty"] * contradiction_penalty
        )
        final_score = max(0.0, min(1.0, raw_score))

        # ── Outdated flag ─────────────────────────────────────────────
        is_outdated = freshness < 0.3 or temporal_consistency < 0.3

        # ── Generate human-readable reasoning ─────────────────────────
        reasoning = CredibilityEngine._generate_reasoning(
            domain_trust=domain_trust,
            author_authority=author_authority,
            content_quality=content_quality,
            agreement=agreement,
            freshness=freshness,
            diversity=diversity,
            temporal_consistency=temporal_consistency,
            contradiction_penalty=contradiction_penalty,
            is_outdated=is_outdated,
        )

        return CredibilityScoreResult(
            final_score=round(final_score, 4),
            components={
                "domain_trust": round(domain_trust, 4),
                "author_authority": round(author_authority, 4),
                "content_quality": round(content_quality, 4),
                "agreement": round(agreement, 4),
                "freshness": round(freshness, 4),
                "diversity": round(diversity, 4),
                "temporal_consistency": round(temporal_consistency, 4),
                "contradiction_penalty": round(contradiction_penalty, 4),
            },
            is_outdated=is_outdated,
            reasoning=reasoning,
        )

    # ── 1. Domain Trust Score ─────────────────────────────────────────────

    @staticmethod
    def _domain_trust_score(evidence: Evidence) -> float:
        """
        Evaluate the credibility of the evidence's domain.

        Sub-signals:
          • Domain age (log scale, capped at ~10 000 days)
          • Reputation list lookup (trusted / suspicious)
          • TLD quality (.gov > .edu > .org > .com > others)
          • HTTPS presence
        """
        domain = CredibilityEngine._extract_domain(evidence.url)

        # --- domain age (0–1) ---
        if evidence.domain_age_days <= 0:
            age_score = 0.5  # unknown → neutral
        else:
            age_score = math.log10(evidence.domain_age_days + 1) / math.log10(10_000)
            age_score = min(age_score, 1.0)

        # --- reputation ---
        if domain in TRUSTED_DOMAINS:
            reputation_score = 1.0
        elif domain in SUSPICIOUS_DOMAINS:
            reputation_score = 0.1
        else:
            reputation_score = 0.5  # unknown

        # --- TLD quality ---
        tld = evidence.tld or CredibilityEngine._extract_tld(evidence.url)
        tld_score = TLD_TRUST_SCORES.get(tld, TLD_DEFAULT_SCORE)

        # --- HTTPS ---
        https_bonus = 1.0 if evidence.is_https else 0.7

        # Weighted combination of sub-signals
        score = (
            0.25 * age_score
            + 0.35 * reputation_score
            + 0.25 * tld_score
            + 0.15 * https_bonus
        )
        return max(0.0, min(1.0, score))

    # ── 2. Author Authority Score ─────────────────────────────────────────

    @staticmethod
    def _author_authority_score(evidence: Evidence) -> float:
        """
        Compute author credibility signal.

        Currently uses author presence as a boost. Historical reliability
        tracking can be plugged in via a DB lookup.
        """
        if evidence.author and evidence.author.strip():
            # Named author → higher trust than anonymous
            author_name = evidence.author.strip()

            # Heuristic: longer / more "real" looking names score higher
            parts = author_name.split()
            if len(parts) >= 2:
                return 0.8  # Full name present
            else:
                return 0.6  # Single name / handle
        return 0.4  # No author attribution

    # ── 3. Content Quality Score ──────────────────────────────────────────

    @staticmethod
    def _content_quality_score(evidence: Evidence) -> float:
        """
        Evaluate depth and structure of the content.

        Sub-signals:
          • Claim specificity (numbers, named entities, verifiable facts)
          • Citation quality (presence of URLs; later: trust of linked domains)
          • Content structure signals
          • Information density (penalise shallow / very short text)
        """
        text = evidence.content or evidence.snippet or ""
        word_count = evidence.words_count or len(text.split())

        # --- Claim specificity ---
        num_numbers = evidence.number_of_numbers or len(re.findall(r"\d+", text))
        # Named entity proxy: capitalised multi-word sequences
        named_entities = len(re.findall(r"[A-Z][a-z]+ [A-Z][a-z]+", text))
        specificity = min(
            1.0,
            (num_numbers * 0.05 + named_entities * 0.1),
        )

        # --- Citation quality ---
        num_links = evidence.number_of_links or len(re.findall(r"https?://", text))
        # Cap: more links isn't linearly better — diminishing returns
        citation_score = min(1.0, num_links * 0.2) if num_links > 0 else 0.0

        # --- Structure signals ---
        has_headings = 1.0 if re.search(r"(^|\n)#{1,3}\s", text) else 0.0
        has_references = 1.0 if re.search(
            r"(reference|source|citation|according to|study|report)", text, re.I
        ) else 0.0
        structure_score = 0.5 * has_headings + 0.5 * has_references

        # --- Information density ---
        # Penalise very short texts, reward moderate-to-long; but do NOT use
        # raw word count as a primary signal.
        if word_count < 20:
            density = 0.2
        elif word_count < 50:
            density = 0.5
        elif word_count < 200:
            density = 0.8
        else:
            density = 1.0

        score = (
            0.30 * specificity
            + 0.25 * citation_score
            + 0.20 * structure_score
            + 0.25 * density
        )
        return max(0.0, min(1.0, score))

    # ── 4. Cross-Source Agreement Score ───────────────────────────────────

    @staticmethod
    def _agreement_score(
        evidence: Evidence, all_evidence: List[Evidence]
    ) -> float:
        """
        Measure how much independent evidence supports the same claim.

        Uses Jaccard similarity on word-level n-grams (bigrams) to cluster
        similar evidence, then counts agreements from independent domains.
        Surface-level duplicates (same source) are excluded.
        """
        if len(all_evidence) <= 1:
            return 0.5  # Cannot measure agreement with a single source

        ev_domain = CredibilityEngine._extract_domain(evidence.url)
        ev_tokens = CredibilityEngine._tokenize(evidence.snippet or evidence.content)
        ev_bigrams = CredibilityEngine._ngrams(ev_tokens, 2)

        if not ev_bigrams:
            return 0.5

        agreeing_domains: Set[str] = set()
        for other in all_evidence:
            if other.url == evidence.url:
                continue
            other_domain = CredibilityEngine._extract_domain(other.url)
            if other_domain == ev_domain:
                continue  # Same source — skip

            other_tokens = CredibilityEngine._tokenize(
                other.snippet or other.content
            )
            other_bigrams = CredibilityEngine._ngrams(other_tokens, 2)
            if not other_bigrams:
                continue

            similarity = CredibilityEngine._jaccard(ev_bigrams, other_bigrams)
            if similarity > 0.15:  # Threshold for "supports same claim"
                agreeing_domains.add(other_domain)

        # Score based on number of independent agreeing domains
        n = len(agreeing_domains)
        if n == 0:
            return 0.3
        elif n == 1:
            return 0.6
        elif n == 2:
            return 0.8
        else:
            return min(1.0, 0.8 + 0.05 * (n - 2))

    # ── 5. Freshness Score ────────────────────────────────────────────────

    @staticmethod
    def _freshness_score(
        evidence: Evidence, reference_time: datetime
    ) -> float:
        """
        Exponential decay based on the evidence's publication timestamp.

        Recent evidence scores high; old evidence scores low.
        Uses a half-life of ~30 days for news-speed decay.
        """
        pub_time = CredibilityEngine._parse_timestamp(evidence.published_at)
        if pub_time is None:
            return 0.5  # Unknown timestamp → neutral

        delta = reference_time - pub_time
        age_days = max(delta.total_seconds() / 86400, 0.0)

        # Exponential decay: half-life ≈ 30 days
        decay_rate = 0.023  # ln(2)/30
        score = math.exp(-decay_rate * age_days)
        return max(0.0, min(1.0, score))

    # ── 6. Source Diversity Score ─────────────────────────────────────────

    @staticmethod
    def _diversity_score(
        evidence: Evidence, all_evidence: List[Evidence]
    ) -> float:
        """
        Reward evidence that contributes to a diverse source landscape.

        • More unique domains in the evidence pool → higher diversity
        • Penalise repeated same-source items (echo chamber)
        """
        if len(all_evidence) <= 1:
            return 0.5

        all_domains = [
            CredibilityEngine._extract_domain(e.url) for e in all_evidence
        ]
        unique_domains = set(all_domains)
        ev_domain = CredibilityEngine._extract_domain(evidence.url)

        # How many times does this evidence's domain appear?
        domain_count = all_domains.count(ev_domain)

        # Pool diversity ratio
        diversity_ratio = len(unique_domains) / len(all_domains)

        # Penalise if this specific domain is over-represented
        repetition_penalty = 1.0 / domain_count if domain_count > 0 else 1.0

        score = 0.6 * diversity_ratio + 0.4 * repetition_penalty
        return max(0.0, min(1.0, score))

    # ── 7. Temporal Consistency Score ─────────────────────────────────────

    @staticmethod
    def _temporal_consistency_score(
        evidence: Evidence,
        all_evidence: List[Evidence],
        reference_time: datetime,
    ) -> float:
        """
        Reward alignment with the latest high-trust consensus.
        Penalise evidence that is contradicted by newer, more trusted sources.

        Logic:
          1. Find the newest evidence items (top quartile by freshness)
          2. Check semantic similarity between this evidence and those items
          3. If aligned with recent consensus → high score
          4. If contradicted by recent items → low score
        """
        if len(all_evidence) <= 1:
            return 0.7  # Neutral-positive for single evidence

        # Sort all evidence by publication time (newest first)
        timed_evidence = []
        for e in all_evidence:
            t = CredibilityEngine._parse_timestamp(e.published_at)
            if t is not None:
                timed_evidence.append((e, t))

        if len(timed_evidence) < 2:
            return 0.7  # Not enough temporal data

        timed_evidence.sort(key=lambda x: x[1], reverse=True)

        # Top quartile = "recent consensus"
        quartile_size = max(1, len(timed_evidence) // 4)
        recent_items = [e for e, _ in timed_evidence[:quartile_size]]

        ev_time = CredibilityEngine._parse_timestamp(evidence.published_at)
        ev_tokens = CredibilityEngine._tokenize(evidence.snippet or evidence.content)
        ev_bigrams = CredibilityEngine._ngrams(ev_tokens, 2)

        if not ev_bigrams:
            return 0.5

        # Check alignment with recent items
        alignment_scores = []
        for recent in recent_items:
            if recent.url == evidence.url:
                continue
            r_tokens = CredibilityEngine._tokenize(
                recent.snippet or recent.content
            )
            r_bigrams = CredibilityEngine._ngrams(r_tokens, 2)
            if r_bigrams:
                sim = CredibilityEngine._jaccard(ev_bigrams, r_bigrams)
                alignment_scores.append(sim)

        if not alignment_scores:
            return 0.5

        avg_alignment = sum(alignment_scores) / len(alignment_scores)

        # Is this evidence itself recent?
        is_self_recent = evidence in [e for e, _ in timed_evidence[:quartile_size]]

        if is_self_recent:
            # Recent evidence aligned with other recent evidence → strong
            return min(1.0, 0.7 + avg_alignment)
        else:
            # Older evidence: alignment with newer consensus is good,
            # but if low alignment, it might be outdated
            if avg_alignment > 0.2:
                return min(1.0, 0.5 + avg_alignment)
            else:
                return max(0.1, 0.4 - (0.2 - avg_alignment))

    # ── 8. Contradiction Penalty ──────────────────────────────────────────

    @staticmethod
    def _contradiction_penalty(
        evidence: Evidence,
        all_evidence: List[Evidence],
        reference_time: datetime,
    ) -> float:
        """
        Detect if this evidence is contradicted by stronger, newer sources.

        Contradiction indicators:
          • Low similarity to recent high-trust evidence (potential disagreement)
          • This evidence is old AND dissimilar to recent consensus

        Returns a penalty value (0 = no penalty, 1 = maximum penalty).
        """
        if len(all_evidence) <= 1:
            return 0.0

        ev_domain = CredibilityEngine._extract_domain(evidence.url)
        ev_freshness = CredibilityEngine._freshness_score(evidence, reference_time)
        ev_trust = CredibilityEngine._domain_trust_score(evidence)

        ev_tokens = CredibilityEngine._tokenize(evidence.snippet or evidence.content)
        ev_bigrams = CredibilityEngine._ngrams(ev_tokens, 2)

        if not ev_bigrams:
            return 0.0

        contradicting_signals: List[float] = []

        for other in all_evidence:
            if other.url == evidence.url:
                continue

            other_domain = CredibilityEngine._extract_domain(other.url)
            if other_domain == ev_domain:
                continue

            other_freshness = CredibilityEngine._freshness_score(
                other, reference_time
            )
            other_trust = CredibilityEngine._domain_trust_score(other)

            # Only consider sources that are NEWER and MORE TRUSTED
            if other_freshness <= ev_freshness or other_trust <= ev_trust:
                continue

            other_tokens = CredibilityEngine._tokenize(
                other.snippet or other.content
            )
            other_bigrams = CredibilityEngine._ngrams(other_tokens, 2)
            if not other_bigrams:
                continue

            similarity = CredibilityEngine._jaccard(ev_bigrams, other_bigrams)

            # Low similarity from a newer+stronger source → contradiction signal
            if similarity < 0.10:
                # Strength of the contradiction signal
                strength = (other_freshness - ev_freshness) * (
                    other_trust - ev_trust
                )
                contradicting_signals.append(strength)

        if not contradicting_signals:
            return 0.0

        # Aggregate: average contradiction strength, scaled to 0–1
        avg_strength = sum(contradicting_signals) / len(contradicting_signals)
        penalty = min(1.0, avg_strength * 3.0)  # Scale factor
        return max(0.0, penalty)

    # ── Reasoning Generator ───────────────────────────────────────────────

    @staticmethod
    def _generate_reasoning(**scores: float) -> str:
        """Build a short human-readable explanation of the score."""
        parts: List[str] = []

        if scores["freshness"] >= 0.8:
            parts.append("Recent source")
        elif scores["freshness"] < 0.3:
            parts.append("Outdated source")

        if scores["domain_trust"] >= 0.8:
            parts.append("from a highly trusted domain")
        elif scores["domain_trust"] < 0.4:
            parts.append("from an unverified or low-trust domain")

        if scores["agreement"] >= 0.7:
            parts.append("corroborated by multiple independent sources")
        elif scores["agreement"] < 0.4:
            parts.append("with limited independent corroboration")

        if scores["contradiction_penalty"] > 0.3:
            parts.append("contradicted by newer high-trust evidence")

        if scores["temporal_consistency"] >= 0.7:
            parts.append("aligned with current consensus")
        elif scores["temporal_consistency"] < 0.4:
            parts.append("potentially superseded by newer information")

        if scores.get("is_outdated"):
            parts.append("(marked as outdated)")

        if scores["content_quality"] >= 0.7:
            parts.append("with high content specificity")

        if scores["author_authority"] >= 0.7:
            parts.append("authored by a named source")

        if not parts:
            parts.append("Moderate credibility based on available signals")

        # Capitalise first segment and join
        reasoning = "; ".join(parts)
        reasoning = reasoning[0].upper() + reasoning[1:] + "."
        return reasoning

    # ── Utility Methods ───────────────────────────────────────────────────

    @staticmethod
    def _extract_domain(url: str) -> str:
        """Extract the base domain from a URL (e.g., 'www.bbc.com' → 'bbc.com')."""
        try:
            netloc = urlparse(url).netloc
            # Strip 'www.' prefix
            if netloc.startswith("www."):
                netloc = netloc[4:]
            return netloc.lower()
        except Exception:
            return ""

    @staticmethod
    def _extract_tld(url: str) -> str:
        """Extract the TLD from a URL (e.g., '.com', '.gov')."""
        try:
            domain = urlparse(url).netloc.lower()
            parts = domain.rsplit(".", 1)
            if len(parts) >= 2:
                return "." + parts[-1]
        except Exception:
            pass
        return ""

    @staticmethod
    def _parse_timestamp(ts: Optional[str]) -> Optional[datetime]:
        """Parse an ISO 8601 timestamp string into a timezone-aware datetime."""
        if not ts:
            return None
        try:
            # Handle common ISO formats
            ts_clean = ts.strip()
            # Try standard ISO first
            dt = datetime.fromisoformat(ts_clean.replace("Z", "+00:00"))
            # Ensure timezone-aware
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except (ValueError, TypeError):
            return None

    @staticmethod
    def _tokenize(text: str) -> List[str]:
        """Simple whitespace + punctuation tokenizer. Lowercase."""
        return re.findall(r"[a-z0-9]+", text.lower())

    @staticmethod
    def _ngrams(tokens: List[str], n: int) -> Set[Tuple[str, ...]]:
        """Generate n-grams from a token list."""
        if len(tokens) < n:
            return set()
        return {tuple(tokens[i : i + n]) for i in range(len(tokens) - n + 1)}

    @staticmethod
    def _jaccard(
        set_a: Set[Tuple[str, ...]], set_b: Set[Tuple[str, ...]]
    ) -> float:
        """Jaccard similarity coefficient between two sets."""
        if not set_a or not set_b:
            return 0.0
        intersection = len(set_a & set_b)
        union = len(set_a | set_b)
        return intersection / union if union > 0 else 0.0
