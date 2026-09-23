import type { AIBOMResource } from '../types/aibom';
import {
  getAibomVersion,
  getArchitecture,
  getCudaVersion,
  getDeclaredDatasetLicense,
  getDeclaredDatasetName,
  getDeclaredDatasetVersion,
  getDirty,
  getDriverVersion,
  getDtype,
  getEnvironmentFrameworkVersion,
  getExperimentIntent,
  getFramework,
  getGitBranch,
  getGitCommit,
  getGitRepository,
  getGpuCount,
  getGpuType,
  getJobName,
  getModelName,
  getModelVersion,
  getQuantization,
  hasDatasetDrift,
} from './aibomFields';

export interface FieldRow {
  label: string;
  values: string[];
  /** True when not every selected item has the same value for this field. */
  differs: boolean;
}

/** One row per field `oc-aibom`'s `Diff` compares, applied across N items instead of just 2. */
const FIELD_ACCESSORS: { label: string; getValue: (a: AIBOMResource) => string }[] = [
  { label: 'Job', getValue: getJobName },
  { label: 'Experiment Intent', getValue: getExperimentIntent },
  { label: 'Model Name', getValue: getModelName },
  { label: 'Model Version', getValue: getModelVersion },
  { label: 'Architecture', getValue: getArchitecture },
  { label: 'Framework', getValue: getFramework },
  { label: 'Quantization', getValue: getQuantization },
  { label: 'Dtype', getValue: getDtype },
  { label: 'Declared Dataset', getValue: getDeclaredDatasetName },
  { label: 'Declared Dataset Version', getValue: getDeclaredDatasetVersion },
  { label: 'Declared Dataset License', getValue: getDeclaredDatasetLicense },
  { label: 'Dataset Drift', getValue: (a) => String(hasDatasetDrift(a)) },
  { label: 'Git Repository', getValue: getGitRepository },
  { label: 'Git Commit', getValue: getGitCommit },
  { label: 'Git Branch', getValue: getGitBranch },
  { label: 'Dirty', getValue: (a) => String(getDirty(a)) },
  { label: 'GPU Type', getValue: getGpuType },
  { label: 'GPU Count', getValue: (a) => String(getGpuCount(a)) },
  { label: 'CUDA Version', getValue: getCudaVersion },
  { label: 'Driver Version', getValue: getDriverVersion },
  { label: 'Framework Version', getValue: getEnvironmentFrameworkVersion },
  { label: 'AIBOM Version', getValue: getAibomVersion },
];

export function buildFieldRows(items: AIBOMResource[]): FieldRow[] {
  return FIELD_ACCESSORS.map(({ label, getValue }) => {
    const values = items.map(getValue);
    return { label, values, differs: new Set(values).size > 1 };
  });
}
