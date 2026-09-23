import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import {
  DocumentTitle,
  ListPageHeader,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { Alert, Bullseye, PageSection, Spinner } from '@patternfly/react-core';
import type { AIBOMResource } from '../types/aibom';
import { HARDWARE_METRIC_LABELS, HARDWARE_METRIC_ORDER } from '../types/aibom';
import AIBOMHeaderSection from './detail/AIBOMHeaderSection';
import AIBOMModelSection from './detail/AIBOMModelSection';
import AIBOMDatasetSection from './detail/AIBOMDatasetSection';
import AIBOMSourceSection from './detail/AIBOMSourceSection';
import AIBOMTrainingSection from './detail/AIBOMTrainingSection';
import AIBOMEnvironmentSection from './detail/AIBOMEnvironmentSection';
import AIBOMPodsSection from './detail/AIBOMPodsSection';
import AIBOMMetadataSection from './detail/AIBOMMetadataSection';
import AIBOMMetricsTable from './detail/AIBOMMetricsTable';

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
          <>
            <AIBOMHeaderSection item={item} />
            <AIBOMModelSection model={data?.model} />
            <AIBOMDatasetSection dataset={data?.dataset} />
            <AIBOMSourceSection sourceCode={data?.source_code} />
            <AIBOMTrainingSection
              training={data?.training}
              fineTuning={data?.fine_tuning}
              inference={data?.inference}
            />
            <AIBOMEnvironmentSection environment={data?.environment} />
            <AIBOMPodsSection pods={data?.execution_metadata?.pods} />
            {data?.resource_utilization && (
              <AIBOMMetricsTable
                title={t('Hardware Performance')}
                metrics={data.resource_utilization.metrics}
                order={HARDWARE_METRIC_ORDER}
                labels={HARDWARE_METRIC_LABELS}
                summaryIncludesColdStart={data.resource_utilization.summary_includes_cold_start}
                grafanaLinks={data.resource_utilization.grafana_links}
                note={data.resource_utilization.note}
              />
            )}
            <AIBOMMetadataSection metadata={data?._metadata} />
          </>
        )}
      </PageSection>
    </>
  );
};

export default AIBOMDetailPage;
