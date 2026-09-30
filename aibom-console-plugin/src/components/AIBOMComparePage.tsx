import type { FC } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import {
  DocumentTitle,
  ListPageHeader,
  useK8sWatchResources,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  Alert,
  Bullseye,
  Grid,
  PageSection,
  Spinner,
  Tab,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
import type { AIBOMResource } from '../types/aibom';
import { getJobName } from '../utils/aibomFields';
import { getPluginFeatureFlags } from '../utils/pluginFeatureFlags';
import AIBOMCompareFieldsTable from './compare/AIBOMCompareFieldsTable';
import AIBOMCompareTelemetryTab from './compare/AIBOMCompareTelemetryTab';
import AIBOMComparePerformanceTable from './compare/AIBOMComparePerformanceTable';
import Section from './detail/Section';

const AIBOM_GVK = { group: 'aibom.io', version: 'v1alpha1', kind: 'AIBOM' };

/** Parses the `items` query param: a comma-joined list of `namespace/name` pairs, itself URI-encoded as a single value so neither separator collides with real namespace/name characters. */
function parseItemKeys(raw: string | null): { key: string; namespace: string; name: string }[] {
  if (!raw) return [];
  return decodeURIComponent(raw)
    .split(',')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const [namespace, name] = pair.split('/');
      return { key: pair, namespace, name };
    })
    .filter((item) => item.namespace && item.name);
}

const AIBOMComparePage: FC = () => {
  const { t } = useTranslation('plugin__aibom-console-plugin');
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<string | number>('overview');
  const [telemetryEnabled, setTelemetryEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getPluginFeatureFlags().then((flags) => {
      if (!cancelled) setTelemetryEnabled(flags.telemetryTab);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const itemKeys = useMemo(() => parseItemKeys(searchParams.get('items')), [searchParams]);

  const watchResources = useMemo(
    () =>
      Object.fromEntries(
        itemKeys.map(({ key, namespace, name }) => [
          key,
          { groupVersionKind: AIBOM_GVK, namespace, name, isList: false },
        ]),
      ),
    [itemKeys],
  );

  // A single-resource watch (isList: false) initializes `data` to `null`
  // until it loads -- unlike a list watch's `[]` default -- so every access
  // below must tolerate `null`, not just the AIBOMResource the SDK's own
  // generic claims once loaded.
  const results = useK8sWatchResources<Record<string, AIBOMResource>>(
    watchResources,
  ) as unknown as Record<
    string,
    { data: AIBOMResource | null; loaded: boolean; loadError: unknown }
  >;
  const loaded = itemKeys.every(({ key }) => results[key].loaded);
  const loadErrorKey = itemKeys.find(({ key }) => results[key].loadError)?.key;
  const missingKey =
    loaded && !loadErrorKey
      ? itemKeys.find(({ key }) => results[key].data == null)?.key
      : undefined;
  const items = itemKeys
    .map(({ key }) => results[key].data)
    .filter((data): data is AIBOMResource => data != null);
  const runNames = itemKeys.map(({ key, name }) => {
    const data = results[key].data;
    const jobName = data === null ? '' : getJobName(data);
    return jobName || name;
  });

  return (
    <>
      <DocumentTitle>{t('Compare AIBOMs')}</DocumentTitle>
      <ListPageHeader title={t('Compare AIBOMs')} />
      <PageSection>
        {itemKeys.length < 2 ? (
          <Alert variant="warning" title={t('Select at least 2 AIBOMs to compare')} />
        ) : loadErrorKey ? (
          <Alert variant="danger" title={t('Error loading AIBOMs')}>
            {results[loadErrorKey].loadError instanceof Error
              ? results[loadErrorKey].loadError.message
              : t('Unknown error')}
          </Alert>
        ) : missingKey ? (
          <Alert variant="danger" title={t('AIBOM not found')}>
            {missingKey}
          </Alert>
        ) : !loaded ? (
          <Bullseye>
            <Spinner size="xl" aria-label={t('Loading AIBOMs')} />
          </Bullseye>
        ) : (
          <Tabs
            // Telemetry issues a Prometheus query per run per chart; don't mount it until opened.
            mountOnEnter
            activeKey={activeTab}
            onSelect={(_event, key) => {
              setActiveTab(key);
            }}
          >
            <Tab eventKey="overview" title={<TabTitleText>{t('Overview')}</TabTitleText>}>
              <Grid hasGutter>
                <Section title={t('Fields')}>
                  <AIBOMCompareFieldsTable items={items} runNames={runNames} />
                </Section>
                <Section title={t('Hardware Performance')}>
                  <AIBOMComparePerformanceTable items={items} runNames={runNames} />
                </Section>
              </Grid>
            </Tab>
            {telemetryEnabled && (
              <Tab eventKey="telemetry" title={<TabTitleText>{t('Telemetry')}</TabTitleText>}>
                <AIBOMCompareTelemetryTab items={items} runNames={runNames} />
              </Tab>
            )}
          </Tabs>
        )}
      </PageSection>
    </>
  );
};

export default AIBOMComparePage;
