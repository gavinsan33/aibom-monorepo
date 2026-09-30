import { k8sGet } from '@openshift-console/dynamic-plugin-sdk';
import type { K8sModel } from '@openshift-console/dynamic-plugin-sdk';
import type { AIBOMResource } from '../types/aibom';
import type { StoredTelemetry } from '../types/telemetrySeries';
import { loadStoredTelemetry, seriesSource } from './storedTelemetry';

const AIBOM_TELEMETRY_MODEL: K8sModel = {
  apiGroup: 'aibom.io',
  apiVersion: 'v1alpha1',
  kind: 'AIBOMTelemetry',
  plural: 'aibomtelemetries',
  abbr: 'AIT',
  label: 'AIBOMTelemetry',
  labelPlural: 'AIBOMTelemetries',
  namespaced: true,
  crd: true,
};

/** True when the AIBOM references stored series (it may still fail to load). */
export const hasStoredTelemetryRef = (item: AIBOMResource): boolean => {
  const ref = item.spec?.data?.telemetry_series_ref;
  return Boolean(ref && seriesSource(ref) && item.metadata?.namespace);
};

/**
 * One-shot fetch of an AIBOM's stored series (the Compare tab uses a watch
 * instead). Resolves undefined for no reference, an unreadable or missing
 * object, an unsupported schema, or a digest mismatch -- the export just skips
 * that AIBOM.
 */
export async function fetchStoredTelemetry(
  item: AIBOMResource,
): Promise<StoredTelemetry | undefined> {
  const ref = item.spec?.data?.telemetry_series_ref;
  const source = ref && seriesSource(ref);
  const namespace = item.metadata?.namespace;
  if (!ref || !source || !namespace) return undefined;
  try {
    const resource: unknown = await k8sGet({
      model: AIBOM_TELEMETRY_MODEL,
      name: source.name,
      ns: namespace,
    });
    return await loadStoredTelemetry(ref, source.text(resource));
  } catch {
    return undefined;
  }
}
