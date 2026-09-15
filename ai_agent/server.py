import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT))

# ponytail: server.py se puede correr desde ai_agent/; cargar root .env aquí
from dotenv import load_dotenv
load_dotenv(REPO_ROOT / ".env")

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Dict, Any

from ai_agent.agent import pre_categorize
from ai_agent.llm_client import LLMClient

app = FastAPI(title="AI Triage Agent", version="0.1.0")
client = LLMClient()


class PreCategorizeRequest(BaseModel):
    answers: Dict[str, Any]


@app.get("/health")
def health():
    return {"status": "ok", "llm": client.health()}


@app.post("/pre-categorize")
def pre_categorize_endpoint(request: PreCategorizeRequest):
    try:
        result = pre_categorize(request.answers, client=client)
        return {"pre_categorization": result}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


if __name__ == "__main__":
    import uvicorn

    # ponytail: usar AI_AGENT_PORT/AI_AGENT_HOST para no chocar con el backend Node
    host = os.getenv("AI_AGENT_HOST", os.getenv("HOST", "0.0.0.0"))
    port = int(os.getenv("AI_AGENT_PORT", "8001"))
    uvicorn.run(app, host=host, port=port)
