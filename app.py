# app.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json
from agent.engine import run_agent_loop

app = FastAPI(title="Scoutly Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ResearchRequest(BaseModel):
    prompt: str

@app.post("/api/research")
async def research_endpoint(request: ResearchRequest):
    def event_stream():
        yield f"data: {json.dumps({'type': 'status', 'content': 'Initiating research loop...'})}\n\n"
        result = run_agent_loop(request.prompt)
        yield f"data: {json.dumps({'type': 'final', 'content': result})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")