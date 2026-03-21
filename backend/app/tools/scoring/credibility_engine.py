import math
import random
from typing import List
from app.models.fact_check import Evidence

class CredibilityEngine:
    """
    A pure utility module that computes a numeric credibility score given evidence metadata.
    Refactored from the prior CredibilityScorer.
    """

    @staticmethod
    def compute_score(evidence: Evidence, all_evidence: List[Evidence]) -> float:
        # Step 1: Domain Score
        if evidence.domain_age_days <= 0:
            domain_score = 0.5
        else:
            domain_score = math.log10(evidence.domain_age_days + 1) / math.log10(10000)
            domain_score = min(domain_score, 1.0)
            
        # Step 2: Recency Score
        # Mocking recency for now: randomly simulate the age in days
        age_in_days = random.randint(1, 100)
        recency_score = math.exp(-0.01 * age_in_days)
        
        # Step 3: Content Score
        length_score = min(evidence.words_count / 1000, 1.0)
        
        numeric_density = evidence.number_of_numbers / max(evidence.words_count, 1)
        citation_density = evidence.number_of_links / max(evidence.words_count, 1)
        
        content_score = (0.4 * length_score) + (0.3 * numeric_density) + (0.3 * citation_density)
        content_score = min(content_score, 1.0)
        
        # Step 4: Consistency Score
        # Consistency: how many other sources share the same domain/source name
        consistency_score = len([e for e in all_evidence if e.source == evidence.source]) / max(len(all_evidence), 1)
        
        # Final Score
        credibility = (0.35 * domain_score) + (0.25 * recency_score) + (0.25 * content_score) + (0.15 * consistency_score)
        
        # Clamp between 0.0 and 1.0
        return min(max(credibility, 0.0), 1.0)
