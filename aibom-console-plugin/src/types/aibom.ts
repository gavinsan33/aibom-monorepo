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
  source_code?: {
    git_repository?: string;
    git_commit?: string;
    git_branch?: string;
    dirty?: boolean;
  };
  model?: {
    name?: string;
    architecture?: string;
    framework?: string;
    quantization?: string;
  };
  dataset?: {
    declared?: { name?: string };
    auto_detected?: { dataset_name?: string; matches_declared?: boolean }[];
  };
  training?: { optimizer?: unknown };
  fine_tuning?: { adaptation_method?: unknown };
  inference?: { serving_engine?: unknown };
  environment?: { gpu_type?: string };
  resource_utilization?: {
    metrics?: Record<string, MetricStats>;
  };
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
