import type { getPluginFeatureFlags } from './pluginFeatureFlags';

describe('getPluginFeatureFlags', () => {
  let fetchMock: jest.Mock;

  interface FlagsModule {
    getPluginFeatureFlags: typeof getPluginFeatureFlags;
  }

  const loadModule = () => {
    jest.resetModules();
    return jest.requireActual<FlagsModule>('./pluginFeatureFlags');
  };

  const jsonResponse = (ok: boolean, body?: unknown) => ({
    ok,
    json: () => Promise.resolve(body),
  });

  beforeEach(() => {
    fetchMock = jest.fn();
    (globalThis as { fetch: unknown }).fetch = fetchMock;
  });

  it('returns the served flags when the fetch succeeds', async () => {
    fetchMock.mockResolvedValue(jsonResponse(true, { telemetryTab: false }));
    const { getPluginFeatureFlags } = loadModule();

    await expect(getPluginFeatureFlags()).resolves.toEqual({ telemetryTab: false, csvExport: false });
    expect(fetchMock).toHaveBeenCalledWith('/api/plugins/aibom-console-plugin/feature-flags.json');
  });

  it('fills in defaults for flags missing from the response', async () => {
    fetchMock.mockResolvedValue(jsonResponse(true, {}));
    const { getPluginFeatureFlags } = loadModule();

    await expect(getPluginFeatureFlags()).resolves.toEqual({ telemetryTab: true, csvExport: false });
  });

  it('falls back to defaults when the fetch is not ok', async () => {
    fetchMock.mockResolvedValue(jsonResponse(false));
    const { getPluginFeatureFlags } = loadModule();

    await expect(getPluginFeatureFlags()).resolves.toEqual({ telemetryTab: true, csvExport: false });
  });

  it('falls back to defaults when the fetch rejects', async () => {
    fetchMock.mockRejectedValue(new Error('network error'));
    const { getPluginFeatureFlags } = loadModule();

    await expect(getPluginFeatureFlags()).resolves.toEqual({ telemetryTab: true, csvExport: false });
  });

  it('caches the request across calls', async () => {
    fetchMock.mockResolvedValue(jsonResponse(true, { telemetryTab: false }));
    const { getPluginFeatureFlags } = loadModule();

    const [first, second] = await Promise.all([getPluginFeatureFlags(), getPluginFeatureFlags()]);
    expect(first).toEqual(second);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
