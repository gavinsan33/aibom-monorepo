import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { QueryBrowser } from '@openshift-console/dynamic-plugin-sdk';
import {
  Card,
  CardBody,
  CardTitle,
  Content,
  EmptyState,
  Grid,
  GridItem,
} from '@patternfly/react-core';
import type { AIBOMResource } from '../../types/aibom';
import {
  HARDWARE_METRIC_LABELS,
  HARDWARE_METRIC_ORDER,
  INFERENCE_METRIC_LABELS,
  INFERENCE_METRIC_ORDER,
} from '../../types/aibom';
import { earliestPodStart } from '../../utils/executionMetadata';
import { toFlexNumber } from '../../utils/flexible';
import { buildHardwareQuery, buildVllmQuery } from '../../utils/promql';
import Section from './Section';

interface AIBOMTelemetryTabProps {
  item: AIBOMResource;
}

const AIBOMTelemetryTab: FC<AIBOMTelemetryTabProps> = ({ item }) => {
  const { t } = useTranslation('plugin__aibom-console-plugin');
  const data = item.spec?.data;
  const namespace = item.metadata?.namespace;
  const pods = data?.execution_metadata?.pods ?? [];
  const podNames = pods.map((pod) => pod.pod_name).filter((name): name is string => Boolean(name));

  const start = earliestPodStart(pods);
  const end = item.spec?.collectedAt;
  const startMs = start ? Date.parse(start) : NaN;
  const endMs = end ? Date.parse(end) : NaN;
  const hasWindow = !Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs > startMs;
  const fixedEndTime = hasWindow ? endMs : undefined;
  const timespan = hasWindow ? endMs - startMs : undefined;

  if (podNames.length === 0) {
    return <EmptyState titleText={t('No pod data available for telemetry')} headingLevel="h4" />;
  }

  const gpuCount = toFlexNumber(data?.environment?.gpu_count) ?? 0;
  const isVllm = data?.inference?.serving_engine === 'vllm';

  return (
    <Grid hasGutter>
      <Section title={t('Hardware Telemetry')}>
        {gpuCount > 0 ? (
          <Grid hasGutter>
            {HARDWARE_METRIC_ORDER.map((metricKey) => {
              const query = buildHardwareQuery(metricKey, podNames);
              if (!query) return null;
              const unit = data?.resource_utilization?.metrics?.[metricKey]?.unit;
              return (
                <GridItem key={metricKey} span={12} md={6}>
                  <Card>
                    <CardTitle>{HARDWARE_METRIC_LABELS[metricKey] ?? metricKey}</CardTitle>
                    <CardBody>
                      <QueryBrowser
                        queries={[query]}
                        namespace={namespace}
                        fixedEndTime={fixedEndTime}
                        timespan={timespan}
                        units={unit}
                        showLegend={podNames.length > 1}
                      />
                    </CardBody>
                  </Card>
                </GridItem>
              );
            })}
          </Grid>
        ) : (
          <Content component="p">
            {t("No GPU detected for this workload; hardware telemetry wasn't collected.")}
          </Content>
        )}
      </Section>
      <Section title={t('Inference Telemetry')}>
        {isVllm ? (
          <Grid hasGutter>
            {INFERENCE_METRIC_ORDER.map((metricKey) => {
              const query = buildVllmQuery(metricKey, podNames);
              if (!query) return null;
              const unit = data.inference?.performance?.metrics?.[metricKey]?.unit;
              return (
                <GridItem key={metricKey} span={12} md={6}>
                  <Card>
                    <CardTitle>{INFERENCE_METRIC_LABELS[metricKey] ?? metricKey}</CardTitle>
                    <CardBody>
                      <QueryBrowser
                        queries={[query]}
                        namespace={namespace}
                        fixedEndTime={fixedEndTime}
                        timespan={timespan}
                        units={unit}
                        showLegend={podNames.length > 1}
                      />
                    </CardBody>
                  </Card>
                </GridItem>
              );
            })}
          </Grid>
        ) : (
          <Content component="p">
            {t('Inference telemetry is only available for vLLM workloads.')}
          </Content>
        )}
      </Section>
    </Grid>
  );
};

export default AIBOMTelemetryTab;
