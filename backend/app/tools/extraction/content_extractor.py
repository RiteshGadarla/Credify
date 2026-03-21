import re
from typing import Dict, Any

class ContentExtractor:
    """
    A pure utility tool module focused on extracting and analyzing textual content.
    Provides functions for computing content metadata from articles and snippets.
    """
    
    @staticmethod
    def compute_metadata(snippet: str, content: str) -> Dict[str, Any]:
        """
        Computes various text statistics used downstream for credibility scoring.
        """
        combined_text = f"{snippet} {content}"
        words_count = len(combined_text.split())
        number_of_numbers = len(re.findall(r'\d+', combined_text))
        number_of_links = len(re.findall(r'http[s]?://', combined_text))
        
        return {
            "words_count": words_count,
            "number_of_numbers": number_of_numbers,
            "number_of_links": number_of_links
        }
