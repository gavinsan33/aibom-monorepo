import type { FC } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardBody, CardTitle, Content, Grid, GridItem, Label } from '@patternfly/react-core';
import type { AIBOMResource } from '../../types/aibom';
import {
  HARDWARE_METRIC_LABELS,
  HARDWARE_METRIC_ORDER,
  INFERENCE_METRIC_LABELS,
  INFERENCE_METRIC_ORDER,
} from '../../types/aibom';
import { toFlexNumber } from '../../utils/flexible';
import { buildHardwareQuery, buildVllmQuery } from '../../utils/promql';
import { getTelemetryWindow } from '../../utils/telemetryWindow';
import { runColor } from '../../utils/runColors';
import Section from '../detail/Section';
import TelemetryCompareChart from './TelemetryCompareChart';
import type { CompareChartRun } from './TelemetryCompareChart';

interface AIBOMCompareTelemetryTabProps {
  items: AIBOMResource[];
  runNames: string[];
}

interface ChartSpec {
  key: string;
  title: string;
  units?: string;
  runs: CompareChartRun[];
}

/**
 * Same gating as the single-AIBOM Telemetry tab: hardware charts need
 * `gpu_count > 0`, inference charts need vLLM; a run that doesn't qualify
 * (or has no usable window/namespace) is simply absent from that chart.
 */
function buildChartSpecs(
  items: AIBOMResource[],
  runNames: string[],
  metricKeys: readonly string[],
  labels: Record<string, string>,
  eligible: (item: AIBOMResource) => boolean,
  buildQuery: (metricKey: string, podNames: string[]) => string | undefined,
  unitOf: (item: AIBOMResource, metricKey: string) => string | undefined,
  keyPrefix: string,
): ChartSpec[] {
  return metricKeys.flatMap((metricKey) => {
    const runs: CompareChartRun[] = [];
    let units: string | undefined;
    items.forEach((item, colorIndex) => {
      const namespace = item.metadata?.namespace;
      const { podNames, startMs, endMs, hasWindow } = getTelemetryWindow(item);
      if (!eligible(item) || !namespace || !hasWindow) return;
      const query = buildQuery(metricKey, podNames);
      if (!query) return;
      units ??= unitOf(item, metricKey);
      runs.push({ name: runNames[colorIndex], colorIndex, query, namespace, startMs, endMs });
    });
    return runs.length > 0
      ? [{ key: `${keyPrefix}-${metricKey}`, title: labels[metricKey] ?? metricKey, units, runs }]
      : [];
  });
}

const AIBOMCompareTelemetryTab: FC<AIBOMCompareTelemetryTabProps> = ({ items, runNames }) => {
  const { t } = useTranslation('plugin__aibom-console-plugin');

  const { hardware, inference } = useMemo(
    () => ({
      hardware: buildChartSpecs(
        items,
        runNames,
        HARDWARE_METRIC_ORDER,
        HARDWARE_METRIC_LABELS,
        (item) => (toFlexNumber(item.spec?.data?.environment?.gpu_count) ?? 0) > 0,
        buildHardwareQuery,
        (item, key) => item.spec?.data?.resource_utilization?.metrics?.[key]?.unit,
        'hw',
      ),
      inference: buildChartSpecs(
        items,
        runNames,
        INFERENCE_METRIC_ORDER,
        INFERENCE_METRIC_LABELS,
        (item) => item.spec?.data?.inference?.serving_engine === 'vllm',
        buildVllmQuery,
        (item, key) => item.spec?.data?.inference?.performance?.metrics?.[key]?.unit,
        'inf',
      ),
    }),
    [items, runNames],
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
                <TelemetryCompareChart runs={spec.runs} units={spec.units} />
              </CardBody>
            </Card>
          </GridItem>
        ))}
      </Grid>
    );

  return (
    <Grid hasGutter>
      <GridItem span={12}>
        <Content component="p">
          {t(
            'Time axes show elapsed time since each run started, so runs from different times line up.',
          )}
        </Content>
        {runNames.map((name, index) => (
          <Label key={`${name}-${String(index)}`} color={runColor(index)} isCompact>
            {name}
          </Label>
        ))}
      </GridItem>
      <Section title={t('Hardware Telemetry')}>
        {renderCharts(
          hardware,
          t("No compared run has a GPU; hardware telemetry wasn't collected."),
        )}
      </Section>
      <Section title={t('Inference Telemetry')}>
        {renderCharts(inference, t('Inference telemetry is only available for vLLM workloads.'))}
      </Section>
    </Grid>
  );
};

export default AIBOMCompareTelemetryTab;
