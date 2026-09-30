import { useEffect, useMemo, useState } from 'react';
import { useK8sWatchResources } from '@openshift-console/dynamic-plugin-sdk';
import type { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import type { AIBOMResource } from '../../types/aibom';
import type { StoredTelemetry } from '../../types/telemetrySeries';
import { checkStoredTelemetry, seriesSource } from '../../utils/storedTelemetry';

interface WatchResult {
  data: K8sResourceCommon | null;
  loaded: boolean;
  loadError: unknown;
}

export interface StoredTelemetryState {
  /** True until every referenced series object has loaded and been verified. */
  loading: boolean;
  /** Parallel to `items`; undefined when an AIBOM has no (usable) stored series. */
  byItem: (StoredTelemetry | undefined)[];
  /** Indexes into `items` whose stored series disagrees with the AIBOM's recorded digest/size. Never charted. */
  mismatched: number[];
}

/**
 * Loads the `AIBOMTelemetry` object each AIBOM references, through the console
 * proxy with the viewer's own token, so no plugin RBAC. An AIBOM with no
 * reference, or whose object is missing, unreadable, unsupported, or fails its
 * digest, yields `undefined` and the caller falls back to live queries; a
 * digest/size mismatch is additionally reported in `mismatched` for a warning.
 */
export function useStoredTelemetry(items: AIBOMResource[]): StoredTelemetryState {
  const watches = useMemo(
    () =>
      Object.fromEntries(
        items.flatMap((item, index) => {
          const ref = item.spec?.data?.telemetry_series_ref;
          const namespace = item.metadata?.namespace;
          const source = ref && seriesSource(ref);
          return source && namespace
            ? [
                [
                  String(index),
                  {
                    groupVersionKind: source.groupVersionKind,
                    namespace,
                    name: source.name,
                    isList: false,
                  },
                ],
              ]
            : [];
        }),
      ),
    [items],
  );

  const results = useK8sWatchResources<Record<string, K8sResourceCommon>>(
    watches,
  ) as unknown as Record<string, WatchResult | undefined>;

  const pending = Object.keys(watches).some((key) => !results[key]?.loaded);

  // Re-verify only when the series object or its reference actually changes.
  const inputKey = items
    .map((item, index) => {
      const resource = results[String(index)]?.data;
      return `${String(index)}:${item.spec?.data?.telemetry_series_ref?.sha256 ?? ''}:${resource?.metadata?.resourceVersion ?? ''}`;
    })
    .join('|');

  const [verified, setVerified] = useState<
    { key: string; byItem: (StoredTelemetry | undefined)[]; mismatched: number[] } | undefined
  >();

  useEffect(() => {
    if (pending) return undefined;
    let cancelled = false;
    void Promise.all(
      items.map((item, index) => {
        const ref = item.spec?.data?.telemetry_series_ref;
        const resource = results[String(index)]?.data;
        const text = ref && resource ? seriesSource(ref)?.text(resource) : undefined;
        return ref ? checkStoredTelemetry(ref, text) : Promise.resolve(undefined);
      }),
    )
      .then((checks) => {
        if (cancelled) return;
        setVerified({
          key: inputKey,
          byItem: checks.map((c) => (c?.status === 'ok' ? c.stored : undefined)),
          mismatched: checks.flatMap((c, i) => (c?.status === 'mismatch' ? [i] : [])),
        });
      })
      .catch(() => {
        // Defensive: loading must always finish, or the tab spins forever.
        if (!cancelled)
          setVerified({ key: inputKey, byItem: items.map(() => undefined), mismatched: [] });
      });
    return () => {
      cancelled = true;
    };
    // `items`/`results` are represented by `inputKey` and `pending`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputKey, pending]);

  const ready = !pending && verified?.key === inputKey;
  return {
    loading: !ready,
    byItem: ready ? verified.byItem : items.map(() => undefined),
    mismatched: ready ? verified.mismatched : [],
  };
}
