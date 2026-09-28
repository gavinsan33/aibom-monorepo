import { buildHardwareQuery, buildVllmQuery } from './promql';

describe('buildHardwareQuery', () => {
  it('builds each hardware metric query verbatim for a single pod', () => {
    const pod = ['pod-a'];
    expect(buildHardwareQuery('gpu_utilization', pod)).toBe(
      'avg_over_time(DCGM_FI_DEV_GPU_UTIL{exported_pod=~"pod-a"}[5m])',
    );
    expect(buildHardwareQuery('gpu_memory_used', pod)).toBe(
      'avg_over_time(DCGM_FI_DEV_FB_USED{exported_pod=~"pod-a"}[5m])',
    );
    expect(buildHardwareQuery('gpu_power', pod)).toBe(
      'avg_over_time(DCGM_FI_DEV_POWER_USAGE{exported_pod=~"pod-a"}[5m])',
    );
    expect(buildHardwareQuery('cpu_usage', pod)).toBe(
      'rate(container_cpu_usage_seconds_total{pod=~"pod-a", container!="POD", container!=""}[5m])',
    );
    expect(buildHardwareQuery('memory_usage', pod)).toBe(
      'container_memory_working_set_bytes{pod=~"pod-a", container!="POD", container!=""}',
    );
    expect(buildHardwareQuery('network_receive', pod)).toBe(
      'rate(container_network_receive_bytes_total{pod=~"pod-a"}[5m])',
    );
    expect(buildHardwareQuery('network_transmit', pod)).toBe(
      'rate(container_network_transmit_bytes_total{pod=~"pod-a"}[5m])',
    );
    expect(buildHardwareQuery('storage_read_throughput', pod)).toBe(
      'sum by (pod) (rate(container_fs_reads_bytes_total{pod=~"pod-a", container!="POD", container!=""}[5m])) or ' +
        'sum by (pod) (rate(container_fs_reads_bytes_total{pod=~"pod-a", container=""}[5m]))',
    );
    expect(buildHardwareQuery('storage_write_throughput', pod)).toBe(
      'sum by (pod) (rate(container_fs_writes_bytes_total{pod=~"pod-a", container!="POD", container!=""}[5m])) or ' +
        'sum by (pod) (rate(container_fs_writes_bytes_total{pod=~"pod-a", container=""}[5m]))',
    );
  });

  it('joins multiple pods into a regex alternation', () => {
    expect(buildHardwareQuery('cpu_usage', ['pod-a', 'pod-b'])).toBe(
      'rate(container_cpu_usage_seconds_total{pod=~"pod-a|pod-b", container!="POD", container!=""}[5m])',
    );
  });

  it('returns undefined for no pods or an unknown metric', () => {
    expect(buildHardwareQuery('cpu_usage', [])).toBeUndefined();
    expect(buildHardwareQuery('not_a_metric', ['pod-a'])).toBeUndefined();
  });
});

describe('buildVllmQuery', () => {
  it('builds each vLLM metric query verbatim for a single pod', () => {
    const pod = ['pod-a'];
    expect(buildVllmQuery('time_to_first_token_seconds', pod)).toBe(
      'rate(vllm:time_to_first_token_seconds_sum{pod=~"pod-a"}[5m]) / ' +
        'rate(vllm:time_to_first_token_seconds_count{pod=~"pod-a"}[5m])',
    );
    expect(buildVllmQuery('inter_token_latency_seconds', pod)).toBe(
      'rate(vllm:inter_token_latency_seconds_sum{pod=~"pod-a"}[5m]) / ' +
        'rate(vllm:inter_token_latency_seconds_count{pod=~"pod-a"}[5m])',
    );
    expect(buildVllmQuery('num_requests_running', pod)).toBe(
      'avg_over_time(vllm:num_requests_running{pod=~"pod-a"}[5m])',
    );
    expect(buildVllmQuery('num_requests_waiting', pod)).toBe(
      'avg_over_time(vllm:num_requests_waiting{pod=~"pod-a"}[5m])',
    );
    expect(buildVllmQuery('kv_cache_usage', pod)).toBe(
      'avg_over_time(vllm:kv_cache_usage_perc{pod=~"pod-a"}[5m])',
    );
    expect(buildVllmQuery('prompt_throughput', pod)).toBe(
      'rate(vllm:prompt_tokens_total{pod=~"pod-a"}[5m])',
    );
    expect(buildVllmQuery('generation_throughput', pod)).toBe(
      'rate(vllm:generation_tokens_total{pod=~"pod-a"}[5m])',
    );
  });

  it('joins multiple pods into a regex alternation', () => {
    expect(buildVllmQuery('num_requests_running', ['pod-a', 'pod-b'])).toBe(
      'avg_over_time(vllm:num_requests_running{pod=~"pod-a|pod-b"}[5m])',
    );
  });

  it('returns undefined for no pods or an unknown metric', () => {
    expect(buildVllmQuery('num_requests_running', [])).toBeUndefined();
    expect(buildVllmQuery('not_a_metric', ['pod-a'])).toBeUndefined();
  });
});
