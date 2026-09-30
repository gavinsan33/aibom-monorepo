import type { FC } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Bullseye,
  Card,
  CardBody,
  CardTitle,
  Content,
  EmptyState,
  Grid,
  GridItem,
  Spinner,
} from '@patternfly/react-core';
import type { AIBOMResource } from '../../types/aibom';
import {
  HARDWARE_METRIC_LABELS,
  HARDWARE_METRIC_ORDER,
  INFERENCE_METRIC_LABELS,
  INFERENCE_METRIC_ORDER,
} from '../../types/aibom';
import { getJobName } from '../../utils/aibomFields';
import { hasStoredTelemetryRef } from '../../utils/fetchStoredTelemetry';
import { toFlexNumber } from '../../utils/flexible';
import { buildHardwareQuery, buildVllmQuery } from '../../utils/promql';
import { getTelemetryWindow } from '../../utils/telemetryWindow';
import { useStoredTelemetry } from '../compare/useStoredTelemetry';
import AIBOMStoredTelemetryCharts from './AIBOMStoredTelemetryCharts';
import Section from './Section';
import TelemetryChart from './TelemetryChart';

/** Recorded AIBOM unit -> the `units` value console's QueryBrowser humanizes by. */
const QUERY_BROWSER_UNITS: Record<string, string> = {
  bytes: 'bytes',
  bytes_per_sec: 'Bps',
  seconds: 'seconds',
};

interface AIBOMTelemetryTabProps {
  item: AIBOMResource;
}

/**
 * Live `QueryBrowser` charts straight from Prometheus, for AIBOMs without
 * stored series. Limited to Prometheus's retention (~15 days), and to non-GPU
 * metrics: DCGM series can't pass the namespace-scoped proxy.
 */
const LiveTelemetryCharts: FC<AIBOMTelemetryTabProps> = ({ item }) => {
  const { t } = useTranslation('plugin__aibom-console-plugin');
  const data = item.spec?.data;
  const namespace = item.metadata?.namespace;
  const { podNames, startMs, endMs, hasWindow } = getTelemetryWindow(item);

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
            <GridItem span={12}>
              <Content component="p">
                {t(
                  'Live GPU charts are unavailable: GPU metrics are scraped from the GPU operator namespace, which the namespace-scoped metrics proxy cannot query. Recorded GPU statistics are shown in the Hardware Performance section of the Overview tab.',
                )}
              </Content>
            </GridItem>
            {HARDWARE_METRIC_ORDER.map((metricKey) => {
              const query = buildHardwareQuery(metricKey, podNames);
              if (!query) return null;
              const unit = data?.resource_utilization?.metrics?.[metricKey]?.unit;
              return (
                <GridItem key={metricKey} span={12} md={6}>
                  <Card>
                    <CardTitle>{HARDWARE_METRIC_LABELS[metricKey] ?? metricKey}</CardTitle>
                    <CardBody>
                      {hasWindow && namespace ? (
                        <TelemetryChart
                          query={query}
                          namespace={namespace}
                          endTime={endMs}
                          timespan={endMs - startMs}
                          units={QUERY_BROWSER_UNITS[unit ?? ''] ?? unit}
                          multiPod={podNames.length > 1}
                        />
                      ) : (
                        <Content component="p">Unable to determine time window for query</Content>
                      )}
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
                      {hasWindow && namespace ? (
                        <TelemetryChart
                          query={query}
                          namespace={namespace}
                          endTime={endMs}
                          timespan={endMs - startMs}
                          units={QUERY_BROWSER_UNITS[unit ?? ''] ?? unit}
                          multiPod={podNames.length > 1}
                        />
                      ) : (
                        <Content component="p">Unable to determine time window for query</Content>
                      )}
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

/**
 * Prefers the series stored with the AIBOM (works past Prometheus retention,
 * includes GPU metrics); falls back to live queries when there are none, and
 * when the stored copy fails its digest/size check (with a warning).
 */
const AIBOMTelemetryTab: FC<AIBOMTelemetryTabProps> = ({ item }) => {
  const { t } = useTranslation('plugin__aibom-console-plugin');
  const items = useMemo(() => [item], [item]);
  const { loading, byItem, mismatched } = useStoredTelemetry(items);

  // No reference means nothing to wait for: go straight to live charts.
  if (hasStoredTelemetryRef(item) && loading) {
    return (
      <Bullseye>
        <Spinner size="xl" aria-label={t('Loading telemetry')} />
      </Bullseye>
    );
  }

  const jobName = getJobName(item); // '' when unset, hence not `??`
  const name = jobName === '' ? (item.metadata?.name ?? '') : jobName;
  const stored = byItem[0];
  return (
    <>
      {mismatched.length > 0 && (
        <Alert
          variant="warning"
          isInline
          title={t(
            "Stored telemetry doesn't match the AIBOM's recorded digest for: {{runs}}. It was not charted; these runs are queried live instead.",
            { runs: name },
          )}
        />
      )}
      {stored ? (
        <AIBOMStoredTelemetryCharts
          stored={stored}
          name={name}
          expectsGpu={(toFlexNumber(item.spec?.data?.environment?.gpu_count) ?? 0) > 0}
        />
      ) : (
        <LiveTelemetryCharts item={item} />
      )}
    </>
  );
};

export default AIBOMTelemetryTab;
