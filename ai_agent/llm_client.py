import os
from dotenv import load_dotenv
from openai import OpenAI

# Load env vars from ai_agent/.env if present
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))


class LLMClient:
    """OpenAI-compatible client. Works with Ollama local and most external APIs."""

    def __init__(self, base_url=None, api_key=None, model=None):
        gemini_key = os.getenv("GEMINI_API_KEY")
        grok_key = os.getenv("XAI_API_KEY") or os.getenv("GROK_API_KEY")
        if gemini_key and grok_key:
            raise ValueError("Configura solo GEMINI_API_KEY o XAI_API_KEY, no ambas")
        if os.getenv("AI_AGENT_TOKEN") and not (gemini_key or grok_key or os.getenv("LLM_BASE_URL")):
            raise ValueError("Configura GEMINI_API_KEY, XAI_API_KEY o LLM_BASE_URL para el agente")

        if gemini_key:
            self.provider = "gemini"
            default_url, default_key, default_model = (
                "https://generativelanguage.googleapis.com/v1beta/openai/",
                gemini_key,
                "gemini-2.5-flash",
            )
        elif grok_key:
            self.provider = "grok"
            default_url, default_key, default_model = "https://api.x.ai/v1", grok_key, "grok-4.3"
        else:
            self.provider = "local"
            default_url, default_key, default_model = (
                os.getenv("LLM_BASE_URL", "http://localhost:11434/v1"),
                os.getenv("LLM_API_KEY", "ollama"),
                "qwen2.5:7b",
            )

        self.base_url = base_url or default_url
        self.model = model or os.getenv("LLM_MODEL") or default_model
        self.client = OpenAI(base_url=self.base_url, api_key=api_key or default_key, timeout=45.0, max_retries=0)

    def chat(self, system_prompt, user_prompt, temperature=0.2):
        options = dict(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
        )
        if self.provider != "gemini":
            options["response_format"] = {"type": "json_object"}
        response = self.client.chat.completions.create(**options)
        return response.choices[0].message.content
