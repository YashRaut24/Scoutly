import asyncio
import json
from typing import Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# Import real research agent loop from engine.py
from agent.engine import run_agent_loop

app = FastAPI(title="Scoutly API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SSEEvent(BaseModel):
    type: str  # "status" | "content" | "error"
    phase: Optional[str] = None
    message: Optional[str] = None
    delta: Optional[str] = None

async def generate_status_events(query: str, depth: str = "quick"):
    try:
        depth_label = "Quick Summary" if depth == "quick" else "Deep Dive"
        init_event = SSEEvent(
            type="status", 
            phase="initializing", 
            message="Initializing research agent..."
        )
        yield f"data: {init_event.model_dump_json()}\n\n"
        await asyncio.sleep(0.4)

        search_event = SSEEvent(
            type="status", 
            phase="searching", 
            message=f"Executing searches & reading sources for '{query}'..."
        )
        yield f"data: {search_event.model_dump_json()}\n\n"

        report_text = await asyncio.to_thread(run_agent_loop, query, depth)

        opt_event = SSEEvent(
            type="status", 
            phase="optimizing", 
            message="Synthesizing detailed research report..."
        )
        yield f"data: {opt_event.model_dump_json()}\n\n"
        await asyncio.sleep(0.4)

        # 4. Stream full agent report content
        if report_text:
            for word in report_text.split(" "):
                content_event = SSEEvent(type="content", delta=word + " ")
                yield f"data: {content_event.model_dump_json()}\n\n"
                await asyncio.sleep(0.01)

        # 5. Complete Phase
        done_event = SSEEvent(
            type="status", 
            phase="complete", 
            message="Research complete."
        )
        yield f"data: {done_event.model_dump_json()}\n\n"

    except Exception as e:
        error_event = SSEEvent(
            type="error", 
            message=f"Agent Error: {str(e)}"
        )
        yield f"data: {error_event.model_dump_json()}\n\n"

@app.get("/api/research/stream")
async def stream_research(query: str = "FastAPI", depth: str = "quick"):
    return StreamingResponse(
        generate_status_events(query, depth),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
