import type { AIBOMResource } from '../types/aibom';
import { toFlexNumber } from './flexible';

/** Field accessors centralize where each column/filter reads from `spec`/`spec.data`, mirroring `oc-aibom`'s `Filter.Match`/`Data` field mapping. */
export const getJobName = (a: AIBOMResource): string => a.spec?.jobName ?? '';
export const getModelName = (a: AIBOMResource): string => a.spec?.data?.model?.name ?? '';
export const getExperimentIntent = (a: AIBOMResource): string => a.spec?.experimentIntent ?? '';
export const getQuantization = (a: AIBOMResource): string =>
  a.spec?.data?.model?.quantization ?? '';
export const getArchitecture = (a: AIBOMResource): string =>
  a.spec?.data?.model?.architecture ?? '';
export const getFramework = (a: AIBOMResource): string => a.spec?.data?.model?.framework ?? '';
export const getGpuType = (a: AIBOMResource): string => a.spec?.data?.environment?.gpu_type ?? '';
export const getGitBranch = (a: AIBOMResource): string =>
  a.spec?.data?.source_code?.git_branch ?? '';
export const getGitRepository = (a: AIBOMResource): string =>
  a.spec?.data?.source_code?.git_repository ?? '';
export const getCollectedAt = (a: AIBOMResource): string => a.spec?.collectedAt ?? '';

// Additional accessors for the Compare view's field table (mirrors oc-aibom's Diff field list).
export const getModelVersion = (a: AIBOMResource): string => a.spec?.data?.model?.version ?? '';
export const getDtype = (a: AIBOMResource): string => a.spec?.data?.model?.dtype ?? '';
export const getDeclaredDatasetName = (a: AIBOMResource): string =>
  a.spec?.data?.dataset?.declared?.name ?? '';
export const getDeclaredDatasetVersion = (a: AIBOMResource): string =>
  a.spec?.data?.dataset?.declared?.version ?? '';
export const getDeclaredDatasetLicense = (a: AIBOMResource): string =>
  a.spec?.data?.dataset?.declared?.license ?? '';
export const getGitCommit = (a: AIBOMResource): string =>
  a.spec?.data?.source_code?.git_commit ?? '';
export const getDirty = (a: AIBOMResource): boolean => a.spec?.data?.source_code?.dirty ?? false;
export const getCudaVersion = (a: AIBOMResource): string =>
  a.spec?.data?.environment?.cuda_version ?? '';
export const getDriverVersion = (a: AIBOMResource): string =>
  a.spec?.data?.environment?.driver_version ?? '';
export const getEnvironmentFrameworkVersion = (a: AIBOMResource): string =>
  a.spec?.data?.environment?.framework_version ?? '';
export const getGpuCount = (a: AIBOMResource): number =>
  toFlexNumber(a.spec?.data?.environment?.gpu_count) ?? 0;
export const getAibomVersion = (a: AIBOMResource): string =>
  a.spec?.data?._metadata?.aibom_version ?? '';
export const getResourceUtilizationNote = (a: AIBOMResource): string =>
  a.spec?.data?.resource_utilization?.note ?? '';

/** `""` (not undefined) when the optional `inference` block is absent, matching `Filter.Match`'s "no block means no match" behavior for a non-empty filter value. */
export const getServingEngine = (a: AIBOMResource): string =>
  a.spec?.data?.inference?.serving_engine ?? '';
export const getAdaptationMethod = (a: AIBOMResource): string =>
  a.spec?.data?.fine_tuning?.adaptation_method ?? '';
export const getOptimizer = (a: AIBOMResource): string => a.spec?.data?.training?.optimizer ?? '';

export const hasInference = (a: AIBOMResource): boolean => a.spec?.data?.inference != null;
export const hasFineTuning = (a: AIBOMResource): boolean => a.spec?.data?.fine_tuning != null;
export const hasTraining = (a: AIBOMResource): boolean => a.spec?.data?.training != null;

/** Mirrors `DriftOnly`: true if any auto-detected dataset disagrees with the declared one. */
export const hasDatasetDrift = (a: AIBOMResource): boolean =>
  (a.spec?.data?.dataset?.auto_detected ?? []).some((d) => d.matches_declared === false);

/** Mirrors `ResourceUtilization.MetricAvg`: 0 (not undefined) when the metric was never collected. */
export const getMetricAvg = (a: AIBOMResource, metricKey: string): number => {
  const stats = a.spec?.data?.resource_utilization?.metrics?.[metricKey];
  return toFlexNumber(stats?.avg) ?? 0;
};

export const getMetricUnit = (a: AIBOMResource, metricKey: string): string =>
  a.spec?.data?.resource_utilization?.metrics?.[metricKey]?.unit ?? '';
