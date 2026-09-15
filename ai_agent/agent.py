import json
import re
from typing import Dict, Any

from ai_agent.llm_client import LLMClient
from ai_agent.prompts import build_system_prompt, build_user_prompt, REQUIRED_FEATURES


def _extract_json(text: str) -> Dict[str, Any]:
    """Extract JSON from LLM output even if it includes markdown fences."""
    # Try to find JSON inside markdown fences first
    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fenced:
        text = fenced.group(1)

    text = text.strip()
    if not text.startswith("{"):
        text = text[text.find("{") :]
    if not text.endswith("}"):
        text = text[: text.rfind("}") + 1]

    return json.loads(text)


def _normalize_intensity(value):
    """Ensure intensidad_dolor is an integer 1-10."""
    if isinstance(value, int):
        return max(1, min(10, value))
    if isinstance(value, float):
        return int(round(max(1, min(10, value))))
    if isinstance(value, str):
        match = re.search(r"\d+", value)
        if match:
            return max(1, min(10, int(match.group(0))))
    return 1


def _normalize_pre_categorization(raw: Dict[str, Any]) -> Dict[str, Any]:
    """Sanitize and validate the LLM output against the expected schema."""
    normalized = {}
    for feature in REQUIRED_FEATURES:
        value = raw.get(feature)
        if feature == "intensidad_dolor":
            normalized[feature] = _normalize_intensity(value)
        else:
            normalized[feature] = str(value) if value is not None else "Ninguno"
    return normalized


def pre_categorize(answers, client=None) -> Dict[str, Any]:
    """Pre-categorize patient answers into the 11 features expected by ml_model."""
    client = client or LLMClient()
    system_prompt = build_system_prompt()
    user_prompt = build_user_prompt(answers)

    llm_output = client.chat(system_prompt, user_prompt)
    raw = _extract_json(llm_output)
    return _normalize_pre_categorization(raw)


def _self_check():
    """Validate parsing/normalization with a mock LLM response (no live LLM needed)."""
    fake_output = json.dumps(
        {
            "tipo_dolor": "Provocado",
            "duracion_dolor": "Pasa inmediato",
            "dolor_nocturno": "No",
            "sensibilidad": "Solo frio",
            "hallazgo_visual": "Ninguno",
            "intensidad_dolor": "3/10",
            "movilidad_dental": "Ninguna",
            "profundidad_lesion": "N/A",
            "signos_infeccion": "Ninguno",
            "tratamiento_previo": "Ninguno",
            "estado_periodontal": "Sano",
            "medicamento_dolor": "Ninguno",
            "alivio_medicamento": "N/A",
            "dolor_pulsante": "N/A",
            "dolor_irradiado": "N/A",
            "tiempo_evolucion_dolor": "N/A",
            "dolor_al_morder": "No",
            "tiempo_fistula": "N/A",
            "tiempo_sintomas_gingivales": "N/A",
            "sangrado_encias": "No sangran",
            "mal_aliento": "No",
            "recesion_encia": "No",
            "historial_bolsas": "No, nunca",
        }
    )

    class MockClient:
        def chat(self, system_prompt, user_prompt, temperature=0.2):
            return fake_output

    result = pre_categorize({"queja": "me duele al tomar frío"}, client=MockClient())

    assert set(result.keys()) == set(REQUIRED_FEATURES), f"Missing keys: {result.keys()}"
    assert result["intensidad_dolor"] == 3, f"Expected 3, got {result['intensidad_dolor']}"
    assert result["tipo_dolor"] == "Provocado"
    print("Self-check passed: output schema and intensity normalization work.")


if __name__ == "__main__":
    _self_check()
