import type { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';

/**
 * The `aibom.io/v1alpha1` AIBOM custom resource, mirroring
 * `oc-aibom`'s `internal/aibom/types.go` (the existing CLI's Go types for
 * this same CR). Only the fields the List view needs are typed strictly;
 * `spec.data` has `x-kubernetes-preserve-unknown-fields` (no CRD-enforced
 * schema), so it's kept loosely typed and read through the accessors in
 * `utils/aibomFields.ts` rather than trusted as a strict interface.
 */
export type AIBOMResource = K8sResourceCommon & {
  spec?: {
    jobName?: string;
    modelName?: string;
    experimentIntent?: string;
    collectedAt?: string;
    data?: AIBOMData;
    signature?: string;
    signaturePublicKey?: string;
  };
};

export interface AIBOMData {
  experiment_intent?: string;
  experiment_intent_declared_via?: string;
  experiment_name?: string;
  experiment_description?: string;
  source_code?: {
    git_repository?: string;
    git_commit?: string;
    git_branch?: string;
    declared_via?: string;
    dirty?: boolean;
  };
  execution_metadata?: {
    job_id?: string;
    namespace?: string;
    pods?: AIBOMPod[];
    duration_seconds?: number | string | null;
    status?: string;
  };
  model?: {
    name?: string;
    version?: string;
    architecture?: string;
    framework?: string;
    quantization?: string;
    quantization_bits?: number | string;
    dtype?: string;
    speculative_decoding?: {
      enabled?: boolean;
      draft_model?: string;
      num_speculative_tokens?: number | string;
    };
  };
  dataset?: {
    declared?: {
      name?: string;
      version?: string;
      source?: string;
      license?: string;
      declared_via?: string;
    };
    auto_detected?: {
      dataset_name?: string;
      version?: string;
      license?: string;
      matches_declared?: boolean;
      seen_via?: string[];
    }[];
  };
  training?: {
    optimizer?: string;
    learning_rate?: number | string;
    batch_size?: number | string;
    epochs?: number | string;
    random_seed?: number | string;
    parallelization_strategy?: string;
  };
  fine_tuning?: {
    adaptation_method?: string;
    lora_rank?: number | string;
    lora_alpha?: number | string;
  };
  inference?: {
    serving_engine?: string;
    max_model_len?: number | string;
    tensor_parallel_size?: number | string;
    pipeline_parallel_size?: number | string;
    enable_expert_parallel?: boolean;
    data_parallel_size?: number | string;
    gpu_memory_utilization?: number | string;
    temperature?: number | string;
    top_p?: number | string;
    top_k?: number | string;
    max_tokens?: number | string;
    performance?: {
      collected_at?: string;
      summary_includes_cold_start?: boolean;
      metrics?: Record<string, MetricStats>;
    };
  };
  environment?: {
    gpu_type?: string;
    gpu_count?: number | string;
    cpu_model?: string;
    cpu_cores?: number | string;
    memory_gb?: number | string;
    numa_nodes?: number | string;
    cuda_version?: string;
    driver_version?: string;
    framework_version?: string;
    kernel_version?: string;
  };
  resource_utilization?: {
    collected_at?: string;
    grafana_links?: string[];
    summary_includes_cold_start?: boolean;
    note?: string;
    metrics?: Record<string, MetricStats>;
  };
  _metadata?: {
    aibom_version?: string;
    generated_at?: string;
    generator?: string;
    schema_compliance?: string;
    dataset_detection?: string;
  };
}

export interface AIBOMPod {
  pod_name?: string;
  pod_uid?: string;
  pod_namespace?: string;
  pod_ip?: string;
  node_name?: string;
  start_time?: string;
  status?: string;
  exit_code?: number | string | null;
}

export interface MetricSegments {
  first_third?: number | string | null;
  middle_third?: number | string | null;
  last_third?: number | string | null;
}

export interface MetricStats {
  unit?: string;
  min?: number | string;
  max?: number | string;
  avg?: number | string;
  p95?: number | string;
  limit?: number | string | null;
  segments?: MetricSegments;
}

/** `--sort-by` metric keys accepted by `oc-aibom list`, mapped to the `resource_utilization.metrics` key they read. */
export const SORTABLE_METRICS = {
  'gpu-utilization': 'gpu_utilization',
  'gpu-memory': 'gpu_memory_used',
  'gpu-power': 'gpu_power',
  'cpu-usage': 'cpu_usage',
  'memory-usage': 'memory_usage',
  'network-rx': 'network_receive',
  'network-tx': 'network_transmit',
} as const;

export type SortKey = 'age' | keyof typeof SORTABLE_METRICS;

/** `resource_utilization.metrics` key order/labels, mirroring `oc-aibom`'s `telemetryMetricOrder`/`telemetryMetricLabels`. */
export const HARDWARE_METRIC_ORDER = [
  'gpu_utilization',
  'gpu_memory_used',
  'gpu_power',
  'cpu_usage',
  'memory_usage',
  'network_receive',
  'network_transmit',
  'storage_read_throughput',
  'storage_write_throughput',
] as const;

export const HARDWARE_METRIC_LABELS: Record<string, string> = {
  gpu_utilization: 'GPU Utilization',
  gpu_memory_used: 'GPU Memory',
  gpu_power: 'GPU Power',
  cpu_usage: 'CPU Usage',
  memory_usage: 'Memory Usage',
  network_receive: 'Network RX',
  network_transmit: 'Network TX',
  storage_read_throughput: 'Storage Read',
  storage_write_throughput: 'Storage Write',
};

/** `inference.performance.metrics` key order/labels, mirroring `oc-aibom`'s `vllmMetricOrder`/`vllmMetricLabels`. */
export const INFERENCE_METRIC_ORDER = [
  'time_to_first_token_seconds',
  'inter_token_latency_seconds',
  'num_requests_running',
  'num_requests_waiting',
  'kv_cache_usage',
  'prompt_throughput',
  'generation_throughput',
] as const;

export const INFERENCE_METRIC_LABELS: Record<string, string> = {
  time_to_first_token_seconds: 'TTFT',
  inter_token_latency_seconds: 'ITL',
  num_requests_running: 'Requests Running',
  num_requests_waiting: 'Requests Waiting',
  kv_cache_usage: 'KV Cache Usage',
  prompt_throughput: 'Prompt Throughput',
  generation_throughput: 'Gen Throughput',
};
