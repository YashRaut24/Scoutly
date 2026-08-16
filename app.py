import os
import json
import asyncio
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from groq import Groq
from ddgs import DDGS

# Load environment variables
load_dotenv()

app = FastAPI(title="Scoutly API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_groq_client() -> Groq:
    """Safely instantiates the Groq client per request."""
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GROQ_API_KEY environment variable is not set. Please check your .env file."
        )
    return Groq(api_key=api_key)


class ExplainRequest(BaseModel):
    reportContext: str
    userQuery: str


def fetch_live_search(query: str) -> tuple[str, dict]:
    """Executes a real-time web search for live scores or updates."""
    try:
        results_text = []
        citation_map = {}
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=5):
                url = r.get("href") or r.get("link")
                title = r.get("title", "")
                snippet = r.get("body", "")

                results_text.append(f"Source: {url}\nTitle: {title}\nSnippet: {snippet}")
                if url:
                    citation_map[url] = {
                        "url": url,
                        "title": title,
                        "snippet": snippet
                    }
                    
        return "\n\n".join(results_text), citation_map
    except Exception as e:
        print(f"Web search error: {e}")
        return "No live search results available.", {}


@app.get("/api/research/stream")
async def stream_research(query: str, depth: str = "quick"):
    async def event_generator():
        try:
            depth_label = "Quick Summary" if depth == "quick" else "Deep Dive"

            yield f"data: {json.dumps({'type': 'status', 'phase': 'initializing', 'message': f'Initializing research ({depth_label})...'})}\n\n"
            await asyncio.sleep(0.1)

            yield f"data: {json.dumps({'type': 'status', 'phase': 'searching', 'message': 'Searching live web data...'})}\n\n"
            await asyncio.sleep(0.1)

            # FIX: Capture citation_map instead of discarding it with '_'
            search_results, citation_map = await asyncio.to_thread(fetch_live_search, query)

            # Send citations metadata to frontend UI
            yield f"data: {json.dumps({'type': 'citations', 'citations': citation_map})}\n\n"
            await asyncio.sleep(0.1)

            yield f"data: {json.dumps({'type': 'status', 'phase': 'generating', 'message': 'Synthesizing research report...'})}\n\n"
            await asyncio.sleep(0.1)

            client = get_groq_client()
            prompt = f"""
You are Scoutly, an autonomous web research engine.
Generate a comprehensive, accurate research report in clean Markdown based on the query and live web context below.

User Query: {query}
Research Depth: {depth_label}

Live Web Context:
{search_results}

Guidelines:
- Start directly with key findings or direct answers.
- Use clear section bolding, bullet points, and clean visual formatting.
- Cite sources inline using Markdown links like `[Source Title](URL)` wherever facts or stats are referenced.
"""

            stream = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                stream=True,
            )

            accumulated_report = ""
            for chunk in stream:
                delta = chunk.choices[0].delta.content or ""
                if delta:
                    accumulated_report += delta
                    yield f"data: {json.dumps({'type': 'content', 'delta': delta})}\n\n"
                    await asyncio.sleep(0.01)

            yield f"data: {json.dumps({'type': 'final', 'phase': 'complete', 'content': accumulated_report})}\n\n"

        except Exception as e:
            print(f"Error in stream_research: {e}")
            yield f"data: {json.dumps({'type': 'status', 'phase': 'error', 'message': f'Error: {str(e)}'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
            "X-Accel-Buffering": "no",
        },
    )

@app.post("/api/assistant/explain")
async def explain_report(req: ExplainRequest):
    try:
        if not req.userQuery.strip():
            raise HTTPException(status_code=400, detail="Query cannot be empty.")

        client = get_groq_client()

        # --- STEP 1: GUARDRAIL / CONTEXT VALIDATION ---
        validation_prompt = f"""
Report Context:
{req.reportContext}

User Question: {req.userQuery}

Task: Determine if the User Question relates to an entity, event, or topic mentioned in the Report Context.

Rules:
- If the user asks for updates, live scores, or details on a topic explicitly or implicitly mentioned in the report, respond with "ALLOWED".
- If the user asks about dates, years, or topics completely unmentioned or excluded from the report context (e.g., asking for 2024 scores when 2024 is not in context), respond with "DENIED".

Respond ONLY with "ALLOWED" or "DENIED".
"""

        validation_check = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": validation_prompt}],
            temperature=0.0,
        )

        decision = validation_check.choices[0].message.content.strip().upper()

        if "DENIED" in decision:
            return {
                "answer": "⚠️ **Outside Report Scope**\n\nThis query refers to a year, event, or topic not mentioned in the current research report context. I can only retrieve live data or answers for topics referenced in your active report."
            }

        # --- STEP 2: DYNAMIC SEARCH QUERY GENERATION ---
        search_prompt = f"""
Generate a single targeted web search query (max 6 words) to find live updates or answers for the user question.
Context Snippet: {req.reportContext[:300]}
User Question: {req.userQuery}
Output ONLY the raw search query string.
"""

        search_query_res = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": search_prompt}],
            temperature=0.0,
        )
        search_query = search_query_res.choices[0].message.content.strip()

        live_search_data, citation_map = await asyncio.to_thread(fetch_live_search, search_query)

        # --- STEP 3: FORMATTED RESPONSE GENERATION ---
        final_prompt = f"""
You are Scoutly Bot.

Report Context:
{req.reportContext}

Live Internet Search Data:
{live_search_data}

User Question: {req.userQuery}

Formatting & Style Requirements:
1. Answer the question directly using the live search data and report context.
2. Use concise, structured Markdown formatting with **bullet points** for readability.
3. Bold key statistics, scores, team names, or important metrics.
"""

        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": final_prompt}],
            temperature=0.2,
        )

        return {
            "answer": completion.choices[0].message.content,
            "citationMap": citation_map
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in assistant explain: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))