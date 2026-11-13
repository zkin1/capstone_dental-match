import os
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from llm_client import LLMClient
from server import app


class DeploymentConfigTest(unittest.TestCase):
    @patch("llm_client.OpenAI")
    def test_provider_seleccionado_por_clave(self, openai):
        with patch.dict(os.environ, {"GEMINI_API_KEY": "gemini-test", "XAI_API_KEY": "", "LLM_MODEL": ""}, clear=True):
            gemini = LLMClient()
            gemini.chat("system", "user")
        self.assertEqual(gemini.provider, "gemini")
        self.assertIn("generativelanguage.googleapis.com", gemini.base_url)
        self.assertNotIn("response_format", openai.return_value.chat.completions.create.call_args.kwargs)

        with patch.dict(os.environ, {"GEMINI_API_KEY": "", "XAI_API_KEY": "grok-test", "LLM_MODEL": ""}, clear=True):
            grok = LLMClient()
            grok.chat("system", "user")
        self.assertEqual(grok.provider, "grok")
        self.assertIn("api.x.ai", grok.base_url)
        self.assertEqual(openai.return_value.chat.completions.create.call_args.kwargs["response_format"], {"type": "json_object"})

    def test_agente_rechaza_token_incorrecto(self):
        with patch.dict(os.environ, {"AI_AGENT_TOKEN": ""}):
            self.assertEqual(TestClient(app).post("/pre-categorize", json={"answers": {}}).status_code, 503)
        with patch.dict(os.environ, {"AI_AGENT_TOKEN": "token-correcto"}), patch("server.client", object()), patch("server.pre_categorize", return_value={"ok": True}):
            client = TestClient(app)
            self.assertEqual(client.post("/pre-categorize", json={"answers": {}}, headers={"X-Agent-Token": "incorrecto"}).status_code, 401)
            response = client.post("/pre-categorize", json={"answers": {}}, headers={"X-Agent-Token": "token-correcto"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["pre_categorization"], {"ok": True})

    def test_agente_procesa_respuestas_sin_llm(self):
        with patch.dict(os.environ, {"AI_AGENT_TOKEN": "token-prueba"}), patch("server.client", None), patch("server.pre_categorize") as with_llm:
            client = TestClient(app)
            health = client.get("/health").json()
            self.assertEqual(health["mode"], "rules")
            self.assertIsNone(health["model"])
            response = client.post(
                "/pre-categorize",
                json={"answers": {"intensidad_dolor": "8/10", "signos_infeccion": "Absceso/Hinchazon con fiebre"}},
                headers={"X-Agent-Token": "token-prueba"},
            )
            self.assertEqual(response.status_code, 200)
            answers = response.json()["pre_categorization"]
            self.assertEqual(answers["intensidad_dolor"], 8)
            self.assertEqual(answers["signos_infeccion"], "Absceso/Hinchazon con fiebre")
            with_llm.assert_not_called()

    @patch("llm_client.OpenAI")
    def test_no_elige_dos_proveedores(self, _openai):
        with patch.dict(os.environ, {"GEMINI_API_KEY": "a", "XAI_API_KEY": "b"}, clear=True):
            with self.assertRaises(ValueError):
                LLMClient()
        with patch.dict(os.environ, {"AI_AGENT_TOKEN": "token", "GEMINI_API_KEY": "", "XAI_API_KEY": ""}, clear=True):
            with self.assertRaises(ValueError):
                LLMClient()


if __name__ == "__main__":
    unittest.main()
