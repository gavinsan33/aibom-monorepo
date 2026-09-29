/**
 * PromQL query builders mirroring `aibom-webhook-service`'s
 * `postprocess/postprocess.py` `TELEMETRY_QUERIES`/`VLLM_TELEMETRY_QUERIES`
 * verbatim, so the live charts here read the same underlying series as the
 * AIBOM's own recorded min/avg/max/p95 summary stats. Keep these in sync
 * with that file if its queries ever change -- a drifted label name or
 * missing rate() here would silently render an empty/wrong chart.
 */

/**
 * DNS-1123 subdomain. Pod names come from `spec.data`, which is
 * unvalidated (`x-kubernetes-preserve-unknown-fields`), so anything else
 * (quotes, braces, `|`) could rewrite the query and is dropped, not escaped.
 */
const POD_NAME_RE = /^[a-z0-9]([-a-z0-9.]*[a-z0-9])?$/;
const validPodNames = (podNames: string[]): string[] =>
  podNames.filter((name) => name.length <= 253 && POD_NAME_RE.test(name));

/** `pod=~"a|b|c"`-style regex alternation. Names are pre-validated by `validPodNames` (no regex metacharacters besides `.`, which only over-matches within the same namespace), so no escaping is needed. */
const podRegex = (podNames: string[]): string => podNames.join('|');

type QueryBuilder = (podNames: string[]) => string;

// gpu_utilization / gpu_memory_used / gpu_power are deliberately absent: DCGM
// series carry the exporter pod's `namespace` (nvidia-gpu-operator), so the
// tenancy proxy's injected `namespace=<workload-ns>` matcher never matches
// them. See CLAUDE.md's Telemetry tab GPU note.
const HARDWARE_QUERY_BUILDERS: Partial<Record<string, QueryBuilder>> = {
  cpu_usage: (pods) =>
    `rate(container_cpu_usage_seconds_total{pod=~"${podRegex(pods)}", container!="POD", container!=""}[5m])`,
  memory_usage: (pods) =>
    `container_memory_working_set_bytes{pod=~"${podRegex(pods)}", container!="POD", container!=""}`,
  network_receive: (pods) =>
    `rate(container_network_receive_bytes_total{pod=~"${podRegex(pods)}"}[5m])`,
  network_transmit: (pods) =>
    `rate(container_network_transmit_bytes_total{pod=~"${podRegex(pods)}"}[5m])`,
  storage_read_throughput: (pods) => {
    const p = podRegex(pods);
    return (
      `sum by (pod) (rate(container_fs_reads_bytes_total{pod=~"${p}", container!="POD", container!=""}[5m])) or ` +
      `sum by (pod) (rate(container_fs_reads_bytes_total{pod=~"${p}", container=""}[5m]))`
    );
  },
  storage_write_throughput: (pods) => {
    const p = podRegex(pods);
    return (
      `sum by (pod) (rate(container_fs_writes_bytes_total{pod=~"${p}", container!="POD", container!=""}[5m])) or ` +
      `sum by (pod) (rate(container_fs_writes_bytes_total{pod=~"${p}", container=""}[5m]))`
    );
  },
};

const VLLM_QUERY_BUILDERS: Partial<Record<string, QueryBuilder>> = {
  time_to_first_token_seconds: (pods) => {
    const p = podRegex(pods);
    return (
      `rate(vllm:time_to_first_token_seconds_sum{pod=~"${p}"}[5m]) / ` +
      `rate(vllm:time_to_first_token_seconds_count{pod=~"${p}"}[5m])`
    );
  },
  inter_token_latency_seconds: (pods) => {
    const p = podRegex(pods);
    return (
      `rate(vllm:inter_token_latency_seconds_sum{pod=~"${p}"}[5m]) / ` +
      `rate(vllm:inter_token_latency_seconds_count{pod=~"${p}"}[5m])`
    );
  },
  num_requests_running: (pods) =>
    `avg_over_time(vllm:num_requests_running{pod=~"${podRegex(pods)}"}[5m])`,
  num_requests_waiting: (pods) =>
    `avg_over_time(vllm:num_requests_waiting{pod=~"${podRegex(pods)}"}[5m])`,
  kv_cache_usage: (pods) => `avg_over_time(vllm:kv_cache_usage_perc{pod=~"${podRegex(pods)}"}[5m])`,
  prompt_throughput: (pods) => `rate(vllm:prompt_tokens_total{pod=~"${podRegex(pods)}"}[5m])`,
  generation_throughput: (pods) =>
    `rate(vllm:generation_tokens_total{pod=~"${podRegex(pods)}"}[5m])`,
};

export function buildHardwareQuery(metricKey: string, podNames: string[]): string | undefined {
  const pods = validPodNames(podNames);
  if (pods.length === 0) return undefined;
  return HARDWARE_QUERY_BUILDERS[metricKey]?.(pods);
}

export function buildVllmQuery(metricKey: string, podNames: string[]): string | undefined {
  const pods = validPodNames(podNames);
  if (pods.length === 0) return undefined;
  return VLLM_QUERY_BUILDERS[metricKey]?.(pods);
}
