const { preCategorizar } = require('../../src/adapters/outbound/ai/triage-agent.adapter');

describe('AIAgentService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('returns the pre-categorization from the agent', async () => {
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
      expect.objectContaining({ method: 'POST' })
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
