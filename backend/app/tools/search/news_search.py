import httpx
from urllib.parse import urlparse
from typing import List
from app.models.fact_check import Evidence
from app.core.config import settings
from app.utils.logger import logger
from app.tools.extraction.content_extractor import ContentExtractor


def _extract_url_metadata(url: str) -> dict:
    """Extract TLD and HTTPS flag from a URL."""
    try:
        parsed = urlparse(url)
        netloc = parsed.netloc.lower().replace("www.", "")
        parts = netloc.rsplit(".", 1)
        tld = "." + parts[-1] if len(parts) >= 2 else ""
        is_https = parsed.scheme == "https"
        return {"tld": tld, "is_https": is_https}
    except Exception:
        return {"tld": "", "is_https": False}

class BaseNewsProvider:
    """Base interface for extending retrieval with multiple providers."""
    async def search(self, query: str, num_results: int = 3) -> List[Evidence]:
        raise NotImplementedError

class NewsAPIProvider(BaseNewsProvider):
    """Specific implementation using the NewsAPI service."""
    def __init__(self):
        self.api_key = settings.NEWS_API_KEY
        self.base_url = settings.NEWS_API_BASE_URL

    async def search(self, query: str, num_results: int = 3) -> List[Evidence]:
        if not self.api_key or self.api_key == "your_news_api_key_here":
            logger.warning("NEWS_API_KEY is missing or using placeholder. Returning empty results.")
            return []
            
        params = {
            "q": query,
            "apiKey": self.api_key,
            "pageSize": num_results,
            "language": "en",
            "sortBy": "relevancy"
        }
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(self.base_url, params=params)
                response.raise_for_status()
                data = response.json()
                
                if data.get("status") != "ok":
                    logger.warning(f"News API returned non-ok status: {data}")
                    return []
                    
                articles = data.get("articles", [])
                evidence_list = []
                
                for article in articles:
                    source_name = article.get("source", {}).get("name") or "Unknown Source"
                    url = article.get("url") or ""
                    description = article.get("description") or ""
                    content = article.get("content") or description
                    
                    if not url or not content:
                        continue
                        
                    # Use ContentExtractor tool to fetch metadata
                    metadata = ContentExtractor.compute_metadata(description, content)
                    url_meta = _extract_url_metadata(url)
                    
                    evidence = Evidence(
                        source=source_name,
                        url=url,
                        content=content,
                        snippet=description[:200] + ("..." if len(description) > 200 else ""),
                        credibility_score=0.0,
                        domain_age_days=0,
                        words_count=metadata["words_count"],
                        number_of_numbers=metadata["number_of_numbers"],
                        number_of_links=metadata["number_of_links"],
                        published_at=article.get("publishedAt"),
                        tld=url_meta["tld"],
                        is_https=url_meta["is_https"],
                        author=article.get("author"),
                    )
                    evidence_list.append(evidence)
                    
                return evidence_list
        except (httpx.HTTPError, Exception) as e:
            logger.error(f"Error occurred while fetching news: {e}")
            return []

class SerperNewsProvider(BaseNewsProvider):
    """Specific implementation using the Google Serper API."""
    def __init__(self):
        self.api_key = settings.SERPER_API_KEY
        self.base_url = "https://google.serper.dev/search"

    async def search(self, query: str, num_results: int = 5) -> List[Evidence]:
        if not self.api_key:
            logger.warning("SERPER_API_KEY is missing. Returning empty results.")
            return []

        payload = {"q": query}
        headers = {
            "X-API-KEY": self.api_key,
            "Content-Type": "application/json"
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(self.base_url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()

                evidence_list = []
                organic_results = data.get("organic", [])[:num_results]

                for item in organic_results:
                    url = item.get("link", "")
                    source_name = item.get("source")
                    if not source_name or source_name == "Google Search":
                        source_name = urlparse(url).netloc.replace("www.", "") if url else "Google Search"
                    
                    description = item.get("snippet", "")
                    content = description  # without full page scraping, fallback to snippet
                    title = item.get("title", "")
                    
                    if not url or not description:
                        continue
                        
                    # Use ContentExtractor tool to fetch metadata
                    metadata = ContentExtractor.compute_metadata(title + " " + description, content)
                    url_meta = _extract_url_metadata(url)
                    
                    evidence = Evidence(
                        source=source_name,
                        url=url,
                        content=content,
                        snippet=description[:200] + ("..." if len(description) > 200 else ""),
                        credibility_score=0.0,
                        domain_age_days=0,
                        words_count=metadata["words_count"],
                        number_of_numbers=metadata["number_of_numbers"],
                        number_of_links=metadata["number_of_links"],
                        published_at=item.get("date"),
                        tld=url_meta["tld"],
                        is_https=url_meta["is_https"],
                    )
                    evidence_list.append(evidence)

                return evidence_list
        except (httpx.HTTPError, Exception) as e:
            logger.error(f"Error occurred while fetching from Serper: {e}")
            return []


class RealNewsRetrieval:
    """
    Main tool wrapper for news retrieval orchestration.
    Exposes a simple API for agents to use.
    """
    @staticmethod
    async def search(query: str, num_results: int = 5) -> List[Evidence]:
        provider = SerperNewsProvider()
        return await provider.search(query, num_results)
