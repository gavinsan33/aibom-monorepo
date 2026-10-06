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

/** Why an AIBOM's stored series couldn't be used, so callers can tell a permission problem from missing or corrupt data. */
export type StoredTelemetryFailure =
  'no-reference' | 'forbidden' | 'not-found' | 'invalid' | 'error';

export interface StoredTelemetryResult {
  stored?: StoredTelemetry;
  failure?: StoredTelemetryFailure;
}

/** HTTP status of a rejected console request (`HttpError.code`), if any. */
const httpStatus = (error: unknown): number | undefined => {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'number' ? code : undefined;
};

/**
 * One-shot fetch of an AIBOM's stored series (the Compare tab uses a watch
 * instead). Never throws: the result carries either the series or the reason
 * they're unavailable -- no reference, forbidden (viewer lacks the read grant),
 * not found, invalid (missing payload, digest mismatch, unsupported schema), or
 * another error.
 */
export async function fetchStoredTelemetry(item: AIBOMResource): Promise<StoredTelemetryResult> {
  const ref = item.spec?.data?.telemetry_series_ref;
  const source = ref && seriesSource(ref);
  const namespace = item.metadata?.namespace;
  if (!ref || !source || !namespace) return { failure: 'no-reference' };

  let resource: unknown;
  try {
    resource = await k8sGet({ model: AIBOM_TELEMETRY_MODEL, name: source.name, ns: namespace });
  } catch (error) {
    const status = httpStatus(error);
    if (status === 403 || status === 401) return { failure: 'forbidden' };
    if (status === 404) return { failure: 'not-found' };
    return { failure: 'error' };
  }

  const stored = await loadStoredTelemetry(ref, source.text(resource));
  return stored ? { stored } : { failure: 'invalid' };
}
