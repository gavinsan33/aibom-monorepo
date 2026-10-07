export interface PluginFeatureFlags {
  telemetryTab: boolean;
  csvExport: boolean;
}

const DEFAULT_FLAGS: PluginFeatureFlags = { telemetryTab: true, csvExport: false };

// The console serves plugin static assets same-origin under
// /api/plugins/<name>/ (the same prefix webpack's publicPath uses for
// chunks); the Helm chart overlays feature-flags.json with its own values.
const CONFIG_URL = '/api/plugins/aibom-console-plugin/feature-flags.json';

let cached: Promise<PluginFeatureFlags> | undefined;

export function getPluginFeatureFlags(): Promise<PluginFeatureFlags> {
  cached ??= fetch(CONFIG_URL)
    .then((response) => (response.ok ? response.json() : undefined))
    .then((json: unknown) => {
      if (json && typeof json === 'object') {
        return { ...DEFAULT_FLAGS, ...(json as Partial<PluginFeatureFlags>) };
      }
      return DEFAULT_FLAGS;
    })
    .catch(() => DEFAULT_FLAGS);
  return cached;
}
