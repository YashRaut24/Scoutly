# agent/engine.py
import json
import os
import re
from dotenv import load_dotenv
from openai import OpenAI, BadRequestError
from agent.tools import web_search, scrape_webpage, TOOL_DEFINITIONS

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


def run_agent_loop(user_prompt: str, max_iterations: int = 5):
    """Runs the autonomous ReAct research loop for a given user query."""
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt}
    ]

    for iteration in range(1, max_iterations + 1):
        print(f"\n--- [AGENT ITERATION {iteration}/{max_iterations}] ---")

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

            # Native tool execution path
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
                # Final research response reached
                return msg.content

        except BadRequestError as e:
            # Fallback recovery: extract raw function call from error string
            err_str = str(e)
            match = re.search(r"<function=(\w+)\s*({.*?})(?:</function>|>)?", err_str, re.DOTALL)

            if match:
                func_name, args_json = match.groups()
                try:
                    args = json.loads(args_json)
                    print(f"[ENGINE] Recovered tool call from Groq error payload: {func_name}")
                    result = execute_tool(func_name, args)

                    # Append synthetic message sequence to keep context flowing
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

            # Re-raise if unrecoverable
            raise e

    return "Agent reached maximum iteration limit without completing the request."