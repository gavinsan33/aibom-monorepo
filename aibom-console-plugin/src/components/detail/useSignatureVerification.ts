import { useEffect, useState } from 'react';
import { k8sGet } from '@openshift-console/dynamic-plugin-sdk';
import type { K8sModel } from '@openshift-console/dynamic-plugin-sdk';
import type { AIBOMResource } from '../../types/aibom';
import {
  SIGNING_KEY_CONFIGMAP,
  SIGNING_KEY_DATA_KEY,
  verifySignature,
} from '../../utils/verifySignature';
import type { VerifyResult } from '../../utils/verifySignature';

const CONFIGMAP_MODEL: K8sModel = {
  apiVersion: 'v1',
  kind: 'ConfigMap',
  plural: 'configmaps',
  abbr: 'CM',
  label: 'ConfigMap',
  labelPlural: 'ConfigMaps',
  namespaced: true,
  crd: false,
};

/** The published signing key, or undefined if it can't be read (no grant, no ConfigMap, request failed). */
async function fetchClusterKey(namespace: string): Promise<string | undefined> {
  try {
    const cm = (await k8sGet({
      model: CONFIGMAP_MODEL,
      name: SIGNING_KEY_CONFIGMAP,
      ns: namespace,
    })) as { data?: Record<string, unknown> } | undefined;
    const key = cm?.data?.[SIGNING_KEY_DATA_KEY];
    return typeof key === 'string' ? key : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Verifies the AIBOM's signature against the ConfigMap anchor in its own
 * namespace, read with the viewer's own token. Returns undefined while the
 * anchor is loading; an unreadable anchor yields `unconfirmed`, never `valid`.
 * An unsigned AIBOM needs no fetch.
 */
export function useSignatureVerification(item: AIBOMResource): VerifyResult | undefined {
  const { spec } = item;
  const namespace = item.metadata?.namespace;
  const signed = Boolean(spec?.signature && spec.signaturePublicKey);
  const [anchor, setAnchor] = useState<{ namespace: string; key?: string }>();

  useEffect(() => {
    if (!signed || !namespace) return undefined;
    let cancelled = false;
    void fetchClusterKey(namespace).then((key) => {
      if (!cancelled) setAnchor({ namespace, key });
    });
    return () => {
      cancelled = true;
    };
  }, [signed, namespace]);

  if (!signed) return verifySignature(spec, undefined);
  if (!namespace) return verifySignature(spec, undefined);
  if (anchor?.namespace !== namespace) return undefined;
  return verifySignature(spec, anchor.key);
}
