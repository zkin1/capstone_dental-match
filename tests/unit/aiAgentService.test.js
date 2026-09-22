const { preCategorizar } = require('../../src/adapters/outbound/ai/triage-agent.adapter');

describe('AIAgentService', () => {
  const originalFetch = global.fetch;
  const originalToken = process.env.AI_AGENT_TOKEN;

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.AI_AGENT_TOKEN;
    else process.env.AI_AGENT_TOKEN = originalToken;
  });

  test('returns the pre-categorization from the agent', async () => {
    process.env.AI_AGENT_TOKEN = 'token-de-prueba';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ pre_categorization: { intensidad_dolor: 7, treatment: 'Endodoncia' } })
    });

    await expect(preCategorizar({ intensidad_dolor: 7 })).resolves.toEqual({
      intensidad_dolor: 7,
      treatment: 'Endodoncia'
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/pre-categorize'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-Agent-Token': 'token-de-prueba' }),
      })
    );
  });

  test('returns null for an unsuccessful agent response', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false });
    await expect(preCategorizar({})).resolves.toBeNull();
  });

  test('returns null when the agent is unavailable', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('offline'));
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(preCategorizar({})).resolves.toBeNull();
    warning.mockRestore();
  });
});
