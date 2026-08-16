# agent/engine.py
import json
import os
import re
from dotenv import load_dotenv
from openai import OpenAI, BadRequestError
from agent.tools import web_search, scrape_webpage, TOOL_DEFINITIONS
import trafilatura
import tiktoken
from rank_bm25 import BM25Okapi

load_dotenv()

client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1"
)
MODEL = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")

SYSTEM_PROMPT = """You are Scoutly, an autonomous AI research agent.
Your objective is to conduct thorough, accurate web research using your available tools.

Rules:
1. Break down complex research queries into targeted searches.
2. Scrape specific URLs when you need deeper context from a webpage.
3. Once you have gathered sufficient information, synthesize a concise, structured final report with key findings and sources.
"""


def execute_tool(func_name: str, args: dict):
    """Executes the requested tool by name with provided arguments."""
    print(f"[ENGINE] Executing tool: {func_name} with args: {args}")

    if func_name == "web_search":
        query = args.get("query", "")
        max_results = args.get("max_results", 5)
        return web_search(query=query, max_results=max_results)
    elif func_name == "scrape_webpage":
        url = args.get("url", "")
        return scrape_webpage(url=url)
    else:
        return f"Error: Unknown tool {func_name}"

def extract_main_content(html_content: str) -> str:
    extracted = trafilatura.extract(
        html_content, 
        include_links=True, 
        include_tables=True,
        output_format="markdown"
    )
    return extracted or ""

def truncate_to_tokens(text: str, max_tokens: int = 2000, model: str = "gpt-4o") -> str:
    encoder = tiktoken.encoding_for_model(model)
    tokens = encoder.encode(text)
    
    if len(tokens) <= max_tokens:
        return text
        
    truncated_tokens = tokens[:max_tokens]
    truncated_text = encoder.decode(truncated_tokens)
    
    last_newline = truncated_text.rfind("\n")
    if last_newline > 0:
        return truncated_text[:last_newline] + "\n\n[...Content Truncated...]"
    return truncated_text + " [...Content Truncated...]"

def get_relevant_chunks(scraped_text: str, query: str, top_k: int = 3) -> str:
    paragraphs = [p.strip() for p in scraped_text.split("\n\n") if len(p.strip()) > 50]
    if not paragraphs:
        return scraped_text[:3000]
        
    tokenized_corpus = [p.lower().split() for p in paragraphs]
    bm25 = BM25Okapi(tokenized_corpus)
    
    tokenized_query = query.lower().split()
    top_paragraphs = bm25.get_top_n(tokenized_query, paragraphs, n=top_k)
    
    return "\n\n---\n\n".join(top_paragraphs)

QUICK_SUMMARY_PROMPT = """
You are Scoutly, an agile research assistant. 
Your goal is to provide a concise, high-level summary of the topic.

Guidelines:
- Perform 1 targeted search if needed.
- Keep the final report brief (300-500 words).
- Focus only on core facts, main takeaways, and a quick summary.
"""

DEEP_DIVE_PROMPT = """
You are Scoutly, a thorough autonomous web research engineer. 
Your goal is to conduct an in-depth, exhaustive research report on the topic.

Guidelines:
- Execute multiple diverse search queries to cover different angles, edge cases, and current developments.
- Dive deep into technical details, statistics, comparisons, pros/cons, and real-world context.
- Format the output as a comprehensive, multi-section markdown report:
  1. Executive Summary
  2. Background & Architecture / Context
  3. Key Findings & Detailed Analysis
  4. Comparison / Pros & Cons (if applicable)
  5. Future Outlook & Conclusion
- Aim for an extensive, highly detailed document (1200+ words).
"""

def get_system_prompt(depth: str) -> str:
    return DEEP_DIVE_PROMPT if depth == "deep_dive" else QUICK_SUMMARY_PROMPT

def run_agent_loop(user_prompt: str, depth: str = "quick"):
    """Runs the autonomous ReAct research loop with dynamic depth controls."""
    
    # 1. Set iteration count & system instructions based on depth
    if depth == "deep_dive":
        max_iterations = 10
    else:
        max_iterations = 3

    system_instruction = get_system_prompt(depth)

    messages = [
        {"role": "system", "content": system_instruction},
        {"role": "user", "content": f"Research topic ({depth.upper()} mode): {user_prompt}"}
    ]

    for iteration in range(1, max_iterations + 1):
        print(f"\n--- [AGENT ITERATION {iteration}/{max_iterations}] (Depth: {depth}) ---")
        try:
            response = client.chat.completions.create(
                model=MODEL,
                messages=messages,
                tools=TOOL_DEFINITIONS,
                tool_choice="auto",
                temperature=0.2
            )

            msg = response.choices[0].message
            messages.append(msg)

            if msg.tool_calls:
                for tool_call in msg.tool_calls:
                    func_name = tool_call.function.name
                    raw_args = tool_call.function.arguments
                    try:
                        args = json.loads(raw_args) if isinstance(raw_args, str) else raw_args
                    except json.JSONDecodeError:
                        args = {}

                    result = execute_tool(func_name, args)

                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "name": func_name,
                        "content": json.dumps(result) if isinstance(result, (dict, list)) else str(result)
                    })
            else:
                return msg.content

        except BadRequestError as e:
            err_str = str(e)
            match = re.search(r"<function=(\w+)\s*({.*?})(?:</function>|>)?", err_str, re.DOTALL)

            if match:
                func_name, args_json = match.groups()
                try:
                    args = json.loads(args_json)
                    result = execute_tool(func_name, args)
                    messages.append({
                        "role": "assistant",
                        "content": f"Calling tool `{func_name}` with parameters: {json.dumps(args)}"
                    })
                    messages.append({
                        "role": "user",
                        "content": f"Tool `{func_name}` output:\n{json.dumps(result) if isinstance(result, (dict, list)) else str(result)}"
                    })
                    continue
                except json.JSONDecodeError:
                    pass
            raise e

    return "Agent reached maximum iteration limit without completing the request."