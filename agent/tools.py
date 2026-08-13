# agent/tools.py
import httpx
from bs4 import BeautifulSoup
from ddgs import DDGS

def web_search(query: str, max_results: int = 5):
    print(f"[DEBUG] Searching for query: {query}")
    try:
        with DDGS() as ddgs:
            raw_results = list(ddgs.text(query, max_results=max_results))
        clean_results = []
        for item in raw_results:
            clean_results.append({
                "title": item.get("title", ""),
                "snippet": item.get("body", ""),
                "url": item.get("href", "")
            })
        return clean_results
    except Exception as e:
        print(f"[ERROR] web_search failed: {e}")
        return [{"error": f"Search failed: {str(e)}"}]

def scrape_webpage(url: str, max_chars: int = 4000):
    print(f"[DEBUG] Fetching HTML from: {url}")
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
    }
    try:
        with httpx.Client(timeout=10.0, follow_redirects=True) as client:
            response = client.get(url, headers=headers)
            response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
            tag.extract()
        text = soup.get_text(separator="\n")
        lines = (line.strip() for line in text.splitlines())
        clean_text = "\n".join(line for line in lines if line)
        return clean_text[:max_chars]
    except Exception as e:
        print(f"[ERROR] scrape_webpage failed: {e}")
        return f"Failed to scrape URL {url}: {str(e)}"

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "Search the live internet for recent information, facts, articles, and sources.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query to execute."
                    },
                    "max_results": {
                        "type": "integer",
                        "description": "Number of top search results to retrieve.",
                        "default": 5
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "scrape_webpage",
            "description": "Extract readable text content from a specific web page URL.",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {
                        "type": "string",
                        "description": "The target webpage URL to scrape."
                    }
                },
                "required": ["url"]
            }
        }
    }
]