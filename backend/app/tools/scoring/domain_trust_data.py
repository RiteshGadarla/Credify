"""
Static domain trust data for the credibility engine.
Contains reputation lists, TLD quality rankings, and trust score mappings.
All data is deterministic — no external API calls or randomness.
"""

# ─── Trusted Domains ──────────────────────────────────────────────────────────
# Major wire services, newspapers of record, public broadcasters, and
# high-credibility institutional sources.
TRUSTED_DOMAINS: set[str] = {
    # Wire services
    "reuters.com", "apnews.com", "afp.com",
    # US newspapers of record
    "nytimes.com", "washingtonpost.com", "wsj.com", "usatoday.com",
    # US broadcast / cable news
    "npr.org", "pbs.org", "abcnews.go.com", "cbsnews.com", "nbcnews.com",
    # UK / international
    "bbc.com", "bbc.co.uk", "theguardian.com", "ft.com", "economist.com",
    "aljazeera.com", "dw.com", "france24.com",
    # Science / academia
    "nature.com", "science.org", "scientificamerican.com", "thelancet.com",
    "nejm.org", "pubmed.ncbi.nlm.nih.gov",
    # Fact-checkers
    "snopes.com", "factcheck.org", "politifact.com", "fullfact.org",
    # Government / institutional
    "who.int", "cdc.gov", "nih.gov", "europa.eu", "un.org",
}

# ─── Suspicious / Low-Trust Domains ──────────────────────────────────────────
# Known misinformation, satire (often mistaken for real), and content-farm
# domains.  This is a seed list — production systems should use a DB.
SUSPICIOUS_DOMAINS: set[str] = {
    "infowars.com", "naturalnews.com", "beforeitsnews.com",
    "theonion.com", "babylonbee.com",  # Satire (not malicious, but not factual)
    "worldnewsdailyreport.com", "empirenews.net", "huzlers.com",
    "newslo.com", "dailybuzzlive.com", "libertywritersnews.com",
    "yournewswire.com", "neonnettle.com", "realfarmacy.com",
}

# ─── TLD Trust Scores ────────────────────────────────────────────────────────
# Mapping from top-level domain to a base trust multiplier.
# Government and education TLDs are given the highest trust.
TLD_TRUST_SCORES: dict[str, float] = {
    ".gov": 1.00,
    ".edu": 0.95,
    ".int": 0.90,   # International treaty organisations
    ".mil": 0.90,
    ".org": 0.75,
    ".com": 0.65,
    ".net": 0.60,
    ".co": 0.60,
    ".io": 0.55,
    ".info": 0.50,
    ".biz": 0.40,
    ".xyz": 0.35,
    ".click": 0.30,
    ".top": 0.30,
}

# Default score for TLDs not in the map (country-code TLDs like .uk, .de, etc.)
TLD_DEFAULT_SCORE: float = 0.55
