const AI_AGENT_URL = process.env.AI_AGENT_URL || 'http://localhost:8001';

async function getStatus() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`${AI_AGENT_URL}/health`, { signal: controller.signal });
    return response.ok ? response.json() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function preCategorizar(respuestas) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(`${AI_AGENT_URL}/pre-categorize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Agent-Token': process.env.AI_AGENT_TOKEN || '',
      },
      body: JSON.stringify({ answers: respuestas }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.pre_categorization || null;
  } catch (e) {
    console.warn('AI Agent no disponible, usando fallback:', e.message);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { getStatus, preCategorizar };
