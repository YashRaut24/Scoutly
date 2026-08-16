import os
import asyncio
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from groq import Groq
from duckduckgo_search import DDGS

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


def fetch_live_search(query: str) -> str:
    """Executes a real-time web search for live scores or updates."""
    try:
        results = []
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=4):
                results.append(f"Title: {r['title']}\nSnippet: {r['body']}")
        return "\n\n".join(results)
    except Exception as e:
        print(f"Web search error: {e}")
        return "No live search results available."


@app.post("/api/assistant/explain")
async def explain_report(req: ExplainRequest):
    try:
        # FIX 1: Python uses .strip(), not JS .trim()
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
        # FIX 2: Generate dynamic query based on report context + user prompt (No hardcoded text)
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

        live_search_data = await asyncio.to_thread(fetch_live_search, search_query)

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

        return {"answer": completion.choices[0].message.content}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in assistant explain: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))