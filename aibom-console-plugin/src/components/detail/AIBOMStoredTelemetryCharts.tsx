import type { FC } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardBody, CardTitle, Content, Grid, GridItem, Switch } from '@patternfly/react-core';
import {
  HARDWARE_METRIC_LABELS,
  HARDWARE_METRIC_ORDER,
  INFERENCE_METRIC_LABELS,
  INFERENCE_METRIC_ORDER,
} from '../../types/aibom';
import type { StoredTelemetry } from '../../types/telemetrySeries';
import FitToDataSwitch from '../compare/FitToDataSwitch';
import TelemetryCompareChart from '../compare/TelemetryCompareChart';
import Section from './Section';

const GPU_METRIC_KEYS = ['gpu_utilization', 'gpu_memory_used', 'gpu_power'];

interface AIBOMStoredTelemetryChartsProps {
  stored: StoredTelemetry;
  /** Legend/tooltip name for the run. */
  name: string;
  /** Whether the workload was recorded as using GPUs, to say so when no GPU series were stored. */
  expectsGpu: boolean;
}

interface ChartSpec {
  key: string;
  title: string;
  metricKey: string;
}

const presentMetrics = (
  stored: StoredTelemetry,
  order: readonly string[],
  labels: Record<string, string>,
): ChartSpec[] =>
  order
    .filter((metricKey) => metricKey in stored.metrics)
    .map((metricKey) => ({ key: metricKey, title: labels[metricKey] ?? metricKey, metricKey }));

/**
 * The detail tab's charts, drawn from the series stored with the AIBOM (so
 * they outlive Prometheus retention and include GPU metrics). Same components
 * as the Compare tab, with a single run. Time runs from the run's own start,
 * so the axis is elapsed time, not the wall clock.
 */
const AIBOMStoredTelemetryCharts: FC<AIBOMStoredTelemetryChartsProps> = ({
  stored,
  name,
  expectsGpu,
}) => {
  const { t } = useTranslation('plugin__aibom-console-plugin');
  const [expanded, setExpanded] = useState(false);
  const [fitToData, setFitToData] = useState(false);

  const { hardware, inference } = useMemo(
    () => ({
      hardware: presentMetrics(stored, HARDWARE_METRIC_ORDER, HARDWARE_METRIC_LABELS),
      inference: presentMetrics(stored, INFERENCE_METRIC_ORDER, INFERENCE_METRIC_LABELS),
    }),
    [stored],
  );

  const renderCharts = (specs: ChartSpec[], emptyText: string) =>
    specs.length === 0 ? (
      <Content component="p">{emptyText}</Content>
    ) : (
      <Grid hasGutter>
        {specs.map((spec) => (
          <GridItem key={spec.key} span={12} md={6}>
            <Card>
              <CardTitle>{spec.title}</CardTitle>
              <CardBody>
                <TelemetryCompareChart
                  title={spec.title}
                  unit={stored.metrics[spec.metricKey].unit}
                  expanded={expanded}
                  fitToData={fitToData}
                  runs={[
                    {
                      name,
                      colorIndex: 0,
                      metric: stored.metrics[spec.metricKey],
                      windowStart: stored.window.start,
                      windowEnd: stored.window.end,
                    },
                  ]}
                />
              </CardBody>
            </Card>
          </GridItem>
        ))}
      </Grid>
    );

  const missingGpu = expectsGpu && !GPU_METRIC_KEYS.some((key) => key in stored.metrics);

  return (
    <Grid hasGutter>
      <GridItem span={12}>
        <Content component="p">{t('Time axes show elapsed time since the run started.')}</Content>
        <Switch
          id="aibom-detail-telemetry-expanded"
          label={t('Show individual pods and GPUs')}
          isChecked={expanded}
          onChange={(_event, checked) => {
            setExpanded(checked);
          }}
        />
        <FitToDataSwitch
          id="aibom-detail-telemetry-fit"
          isChecked={fitToData}
          onChange={setFitToData}
        />
      </GridItem>
      <Section title={t('Hardware Telemetry')}>
        {missingGpu && (
          <Content component="p">
            {t(
              'No GPU series were stored for this run. Recorded GPU statistics are in the Hardware Performance section of the Overview tab.',
            )}
          </Content>
        )}
        {renderCharts(hardware, t('No hardware telemetry was stored for this run.'))}
      </Section>
      <Section title={t('Inference Telemetry')}>
        {renderCharts(inference, t('No inference telemetry was stored for this run.'))}
      </Section>
    </Grid>
  );
};

export default AIBOMStoredTelemetryCharts;
