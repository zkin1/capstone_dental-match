import os
from dotenv import load_dotenv
from openai import OpenAI

# Load env vars from ai_agent/.env if present
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))


class LLMClient:
    """OpenAI-compatible client. Works with Ollama local and most external APIs."""

    def __init__(self, base_url=None, api_key=None, model=None):
        self.base_url = base_url or os.getenv("LLM_BASE_URL", "http://localhost:11434/v1")
        self.api_key = api_key or os.getenv("LLM_API_KEY", "ollama")
        self.model = model or os.getenv("LLM_MODEL", "qwen2.5:7b")
        self.client = OpenAI(base_url=self.base_url, api_key=self.api_key)

    def chat(self, system_prompt, user_prompt, temperature=0.2):
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
            response_format={"type": "json_object"},
        )
        return response.choices[0].message.content

    def health(self):
        """Returns a simple string for quick connectivity checks."""
        return f"model={self.model} base_url={self.base_url}"
