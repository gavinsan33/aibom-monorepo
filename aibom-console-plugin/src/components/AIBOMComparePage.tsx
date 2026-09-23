import type { FC } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import {
  DocumentTitle,
  ListPageHeader,
  useK8sWatchResources,
} from '@openshift-console/dynamic-plugin-sdk';
import { Alert, Bullseye, Grid, PageSection, Spinner } from '@patternfly/react-core';
import type { AIBOMResource } from '../types/aibom';
import { getJobName } from '../utils/aibomFields';
import AIBOMCompareFieldsTable from './compare/AIBOMCompareFieldsTable';
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

  const results = useK8sWatchResources<Record<string, AIBOMResource>>(watchResources);
  const loaded = itemKeys.every(({ key }) => results[key].loaded);
  const loadError = itemKeys.find(({ key }) => results[key].loadError)?.key;
  const items = itemKeys.map(({ key }) => results[key].data);
  const runNames = itemKeys.map(({ key, name }) => getJobName(results[key].data) || name);

  return (
    <>
      <DocumentTitle>{t('Compare AIBOMs')}</DocumentTitle>
      <ListPageHeader title={t('Compare AIBOMs')} />
      <PageSection>
        {itemKeys.length < 2 ? (
          <Alert variant="warning" title={t('Select at least 2 AIBOMs to compare')} />
        ) : loadError ? (
          <Alert variant="danger" title={t('Error loading AIBOMs')}>
            {results[loadError].loadError instanceof Error
              ? results[loadError].loadError.message
              : t('Unknown error')}
          </Alert>
        ) : !loaded ? (
          <Bullseye>
            <Spinner size="xl" aria-label={t('Loading AIBOMs')} />
          </Bullseye>
        ) : (
          <Grid hasGutter>
            <Section title={t('Fields')}>
              <AIBOMCompareFieldsTable items={items} runNames={runNames} />
            </Section>
            <Section title={t('Hardware Performance')}>
              <AIBOMComparePerformanceTable items={items} runNames={runNames} />
            </Section>
          </Grid>
        )}
      </PageSection>
    </>
  );
};

export default AIBOMComparePage;
