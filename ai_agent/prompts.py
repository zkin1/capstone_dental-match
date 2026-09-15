# Pre-categorization schema for dental triage.
# These 11 features match the input expected by ml_model.

CATEGORIES = {
    "tipo_dolor": ["Sin dolor", "Provocado", "Espontaneo"],
    "duracion_dolor": ["N/A", "Pasa inmediato", "Persistente", "Constante"],
    "dolor_nocturno": ["Si", "No"],
    "sensibilidad": ["Ninguno", "Solo frio", "Frio y Calor"],
    "hallazgo_visual": [
        "Encias rojas o Sangrado",
        "Mancha u Hoyo",
        "Ninguno",
        "Diente flojo",
        "Diente roto o Fractura",
        "Hinchazon",
    ],
    "movilidad_dental": ["Ninguna", "Grado I o II (a evaluar)", "Grado III (severa)"],
    "profundidad_lesion": [
        "N/A",
        "No visible pero con molestia",
        "Superficial (esmalte)",
        "Moderada (dentina)",
        "Profunda (cerca de pulpa)",
        "Compromete raiz",
    ],
    "signos_infeccion": ["Ninguno", "Fistula", "Absceso/Hinchazon con fiebre"],
    "tratamiento_previo": ["Ninguno", "Restauracion previa", "Endodoncia previa fallida"],
    "estado_periodontal": [
        "Sano",
        "Gingivitis (reversible)",
        "Periodontitis leve",
        "Periodontitis avanzada",
    ],
    "medicamento_dolor": ["Ninguno", "Analgesico comun", "Antibiotico previo", "Otro"],
    "alivio_medicamento": ["N/A", "Si", "Parcialmente", "No"],
    "dolor_pulsante": ["N/A", "Si", "No"],
    "dolor_irradiado": [
        "N/A",
        "No se irradia",
        "Oido",
        "Cabeza",
        "Cuello",
        "Mandibula",
        "Varios lugares",
    ],
    "tiempo_evolucion_dolor": ["N/A", "Menos de 2 dias", "Una semana", "Mas de una semana"],
    "dolor_al_morder": ["Si", "No"],
    "tiempo_fistula": ["N/A", "Reciente", "Antigua"],
    "tiempo_sintomas_gingivales": ["N/A", "Menos de 2 semanas", "Semanas a meses", "Mas de 6 meses"],
    "sangrado_encias": ["No sangran", "Solo al cepillarme", "Espontaneo"],
    "mal_aliento": ["Si", "No"],
    "recesion_encia": ["Si", "No"],
    "historial_bolsas": ["Si, me lo han dicho", "No, nunca", "No lo se"],
}

REQUIRED_FEATURES = [
    "tipo_dolor",
    "duracion_dolor",
    "dolor_nocturno",
    "sensibilidad",
    "hallazgo_visual",
    "intensidad_dolor",
    "movilidad_dental",
    "profundidad_lesion",
    "signos_infeccion",
    "tratamiento_previo",
    "estado_periodontal",
    "medicamento_dolor",
    "alivio_medicamento",
    "dolor_pulsante",
    "dolor_irradiado",
    "tiempo_evolucion_dolor",
    "dolor_al_morder",
    "tiempo_fistula",
    "tiempo_sintomas_gingivales",
    "sangrado_encias",
    "mal_aliento",
    "recesion_encia",
    "historial_bolsas",
]


def build_system_prompt():
    categories_text = "\n".join(
        f"- {key}: {', '.join(values)}" for key, values in CATEGORIES.items()
    )

    return f"""Eres un asistente clínico de triaje dental. Tu trabajo es leer las respuestas de un paciente y devolver una pre-categorización estructurada de síntomas en formato JSON.

Reglas:
1. Devuelve EXACTAMENTE estas 23 claves: {', '.join(REQUIRED_FEATURES)}.
2. Para `intensidad_dolor` usa un número entero del 1 al 10.
3. Para todas las demás claves usa EXACTAMENTE uno de los valores permitidos (respetando mayúsculas, tildes y espacios).
4. Para campos que no apliquen (por ejemplo, si no hay dolor), usa el valor "N/A" o "Ninguno" según lo indique la lista.
5. Si la información no está clara, elige el valor más conservador y seguro.
6. No inventes síntomas que el paciente no mencione.
7. Responde solo con el JSON válido, sin texto adicional.

Valores permitidos:
{categories_text}
"""


def build_user_prompt(answers):
    if isinstance(answers, dict):
        text = "\n".join(f"{q}: {a}" for q, a in answers.items())
    else:
        text = str(answers)

    return f"""Respuestas del paciente:

{text}

Devuelve la pre-categorización en JSON con las 11 claves indicadas."""
