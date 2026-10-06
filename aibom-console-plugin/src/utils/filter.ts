import type { AIBOMResource } from '../types/aibom';
import {
  getAdaptationMethod,
  getArchitecture,
  getFramework,
  getGitBranch,
  getGitRepository,
  getGpuType,
  getJobName,
  getModelName,
  getOptimizer,
  getQuantization,
  getServingEngine,
  hasDatasetDrift,
  hasFineTuning,
  hasInference,
  hasTraining,
  getExperimentIntent,
} from './aibomFields';

/**
 * Narrows a list of AIBOMs by exact-match (case-insensitive) on the given
 * criteria. Empty/undefined fields are not filtered on. Mirrors `oc-aibom`'s
 * `Filter`/`Match` (`internal/aibom/filter.go`).
 */
export interface AIBOMFilter {
  model?: string;
  intent?: string;
  quantization?: string;
  architecture?: string;
  framework?: string;
  gpuType?: string;
  jobName?: string;
  gitBranch?: string;
  gitRepository?: string;
  servingEngine?: string;
  adaptationMethod?: string;
  optimizer?: string;
  driftOnly?: boolean;
}

const equalFold = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase();

export function matchesFilter(a: AIBOMResource, f: AIBOMFilter): boolean {
  if (f.model && !equalFold(getModelName(a), f.model)) return false;
  if (f.intent && !equalFold(getExperimentIntent(a), f.intent)) return false;
  if (f.quantization && !equalFold(getQuantization(a), f.quantization)) return false;
  if (f.architecture && !equalFold(getArchitecture(a), f.architecture)) return false;
  if (f.framework && !equalFold(getFramework(a), f.framework)) return false;
  if (f.gpuType && !equalFold(getGpuType(a), f.gpuType)) return false;
  if (f.jobName && !equalFold(getJobName(a), f.jobName)) return false;
  if (f.gitBranch && !equalFold(getGitBranch(a), f.gitBranch)) return false;
  if (f.gitRepository && !equalFold(getGitRepository(a), f.gitRepository)) return false;
  if (f.servingEngine && (!hasInference(a) || !equalFold(getServingEngine(a), f.servingEngine)))
    return false;
  if (
    f.adaptationMethod &&
    (!hasFineTuning(a) || !equalFold(getAdaptationMethod(a), f.adaptationMethod))
  )
    return false;
  if (f.optimizer && (!hasTraining(a) || !equalFold(getOptimizer(a), f.optimizer))) return false;
  if (f.driftOnly && !hasDatasetDrift(a)) return false;
  return true;
}

export function applyFilter(items: AIBOMResource[], f: AIBOMFilter): AIBOMResource[] {
  return items.filter((a) => matchesFilter(a, f));
}
