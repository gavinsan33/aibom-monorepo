import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import {
  DocumentTitle,
  ListPageHeader,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { Alert, Bullseye, Grid, PageSection, Spinner } from '@patternfly/react-core';
import type { AIBOMResource } from '../types/aibom';
import { HARDWARE_METRIC_LABELS, HARDWARE_METRIC_ORDER } from '../types/aibom';
import AIBOMHeaderSection from './detail/AIBOMHeaderSection';
import AIBOMModelSection from './detail/AIBOMModelSection';
import AIBOMDatasetSection from './detail/AIBOMDatasetSection';
import AIBOMSourceSection from './detail/AIBOMSourceSection';
import AIBOMTrainingSection from './detail/AIBOMTrainingSection';
import AIBOMFineTuningSection from './detail/AIBOMFineTuningSection';
import AIBOMInferenceSection from './detail/AIBOMInferenceSection';
import AIBOMEnvironmentSection from './detail/AIBOMEnvironmentSection';
import AIBOMPodsSection from './detail/AIBOMPodsSection';
import AIBOMMetadataSection from './detail/AIBOMMetadataSection';
import AIBOMMetricsTable from './detail/AIBOMMetricsTable';
import Section from './detail/Section';

const AIBOM_GVK = { group: 'aibom.io', version: 'v1alpha1', kind: 'AIBOM' };

const AIBOMDetailPage: FC = () => {
  const { t } = useTranslation('plugin__aibom-console-plugin');
  const { namespace, name } = useParams<{ namespace: string; name: string }>();

  const [item, loaded, loadError] = useK8sWatchResource<AIBOMResource>({
    groupVersionKind: AIBOM_GVK,
    namespace,
    name,
    isList: false,
  }) as [AIBOMResource | undefined, boolean, unknown];

  const data = item?.spec?.data;
  const title = item?.spec?.jobName ?? name ?? t('AIBOM');

  return (
    <>
      <DocumentTitle>{title}</DocumentTitle>
      <ListPageHeader title={title} />
      <PageSection>
        {loadError ? (
          <Alert variant="danger" title={t('Error loading AIBOM')}>
            {loadError instanceof Error ? loadError.message : t('Unknown error')}
          </Alert>
        ) : !loaded || !item ? (
          <Bullseye>
            <Spinner size="xl" aria-label={t('Loading AIBOM')} />
          </Bullseye>
        ) : (
          <Grid hasGutter>
            <AIBOMHeaderSection item={item} />
            <AIBOMModelSection model={data?.model} />
            <AIBOMDatasetSection dataset={data?.dataset} />
            <AIBOMSourceSection sourceCode={data?.source_code} />
            <AIBOMEnvironmentSection environment={data?.environment} />
            <AIBOMTrainingSection training={data?.training} />
            <AIBOMFineTuningSection fineTuning={data?.fine_tuning} />
            <AIBOMInferenceSection inference={data?.inference} />
            <AIBOMPodsSection pods={data?.execution_metadata?.pods} />
            {data?.resource_utilization && (
              <Section title={t('Hardware Performance')}>
                <AIBOMMetricsTable
                  title={t('Hardware Performance')}
                  showTitle={false}
                  metrics={data.resource_utilization.metrics}
                  order={HARDWARE_METRIC_ORDER}
                  labels={HARDWARE_METRIC_LABELS}
                  summaryIncludesColdStart={data.resource_utilization.summary_includes_cold_start}
                  grafanaLinks={data.resource_utilization.grafana_links}
                  note={data.resource_utilization.note}
                />
              </Section>
            )}
            <AIBOMMetadataSection metadata={data?._metadata} />
          </Grid>
        )}
      </PageSection>
    </>
  );
};

export default AIBOMDetailPage;
