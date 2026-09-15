#!/usr/bin/env node

require('dotenv').config();

const baseUrl = (process.env.AI_AGENT_URL || 'http://localhost:8001').replace(/\/+$/, '');
const timeoutMs = Number(process.env.AI_AGENT_CHECK_TIMEOUT_MS) || 10000;

const sampleAnswers = {
  queja: 'Tengo dolor fuerte y pulsátil desde ayer, con hinchazón y fiebre.',
  intensidad_dolor: 8,
  tipo_dolor: 'Espontaneo',
  signos_infeccion: 'Absceso/Hinchazon con fiebre',
  dolor_nocturno: 'Si',
};

async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${baseUrl}${path}`, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function readJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Respuesta no JSON del agente (HTTP ${response.status}): ${text.slice(0, 200)}`);
  }
}

async function main() {
  console.log(`Comprobando agente IA en ${baseUrl}`);

  let health;
  try {
    const response = await request('/health');
    health = await readJson(response);
    if (!response.ok || health.status !== 'ok') {
      throw new Error(`health inválido (HTTP ${response.status})`);
    }
  } catch (error) {
    throw new Error(`El servicio no está disponible: ${error.message}`);
  }

  const response = await request('/pre-categorize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers: sampleAnswers }),
  });
  const result = await readJson(response);
  const preCategorization = result.pre_categorization;
  if (!response.ok || Array.isArray(result) || result.error || !preCategorization || typeof preCategorization !== 'object') {
    throw new Error(`El endpoint respondió sin pre-categorización (HTTP ${response.status}): ${JSON.stringify(result)}`);
  }
  for (const key of ['tipo_dolor', 'intensidad_dolor', 'signos_infeccion']) {
    if (!(key in preCategorization)) throw new Error(`Falta la clave esperada: ${key}`);
  }

  console.log('✅ Agente activo y pre-categorizando correctamente.');
  console.log(`   LLM configurado: ${health.llm || 'no informado'}`);
  console.log(`   Resultado: ${JSON.stringify(preCategorization)}`);
}

main().catch(error => {
  console.error(`❌ Agente IA no operativo: ${error.message}`);
  process.exitCode = 1;
});
