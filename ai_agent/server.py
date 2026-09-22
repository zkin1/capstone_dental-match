import os
import sys
import hmac
from pathlib import Path

AGENT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(AGENT_DIR))

from dotenv import load_dotenv
load_dotenv(AGENT_DIR.parent / ".env")
load_dotenv(AGENT_DIR / ".env")

from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Dict, Any

from agent import pre_categorize
from llm_client import LLMClient

app = FastAPI(title="AI Triage Agent", version="0.1.0")
client = LLMClient()


class PreCategorizeRequest(BaseModel):
    answers: Dict[str, Any]


@app.get("/health")
def health():
    return {"status": "ok", "provider": client.provider, "model": client.model}


@app.post("/pre-categorize")
def pre_categorize_endpoint(request: PreCategorizeRequest, x_agent_token: str | None = Header(default=None)):
    token = os.getenv("AI_AGENT_TOKEN")
    if not token:
        raise HTTPException(status_code=503, detail="AI_AGENT_TOKEN no configurado")
    if not hmac.compare_digest(x_agent_token or "", token):
        raise HTTPException(status_code=401, detail="No autorizado")
    try:
        result = pre_categorize(request.answers, client=client)
        return {"pre_categorization": result}
    except Exception:
        return JSONResponse(status_code=502, content={"error": "Pre-categorización no disponible"})


if __name__ == "__main__":
    import uvicorn

    # ponytail: usar AI_AGENT_PORT/AI_AGENT_HOST para no chocar con el backend Node
    host = os.getenv("AI_AGENT_HOST", os.getenv("HOST", "0.0.0.0"))
    port = int(os.getenv("AI_AGENT_PORT", "8001"))
    uvicorn.run(app, host=host, port=port)
