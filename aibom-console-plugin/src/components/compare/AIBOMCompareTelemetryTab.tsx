import type { FC } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bullseye,
  Card,
  CardBody,
  CardTitle,
  Content,
  Grid,
  GridItem,
  Label,
  Spinner,
  Switch,
} from '@patternfly/react-core';
import type { AIBOMResource } from '../../types/aibom';
import {
  HARDWARE_METRIC_LABELS,
  HARDWARE_METRIC_ORDER,
  INFERENCE_METRIC_LABELS,
  INFERENCE_METRIC_ORDER,
} from '../../types/aibom';
import type { StoredTelemetry } from '../../types/telemetrySeries';
import { LIVE_METRIC_UNITS } from '../../utils/formatMetricValue';
import { toFlexNumber } from '../../utils/flexible';
import { buildHardwareQuery, buildVllmQuery } from '../../utils/promql';
import { runColor } from '../../utils/runColors';
import { getTelemetryWindow } from '../../utils/telemetryWindow';
import Section from '../detail/Section';
import TelemetryCompareChart from './TelemetryCompareChart';
import type { CompareChartRun } from './TelemetryCompareChart';
import { useStoredTelemetry } from './useStoredTelemetry';

interface AIBOMCompareTelemetryTabProps {
  items: AIBOMResource[];
  runNames: string[];
}

interface ChartSpec {
  key: string;
  title: string;
  unit?: string;
  runs: CompareChartRun[];
}

/**
 * A run contributes its stored series when it has them (only metrics that
 * returned data are stored, so no gpu/vLLM gating is needed -- and stored GPU
 * series are the only per-GPU data, since live DCGM queries can't pass the
 * tenancy proxy). Otherwise it falls back to a live query under the same
 * gating as the single-AIBOM Telemetry tab: hardware needs `gpu_count > 0`,
 * inference needs vLLM.
 */
function buildChartSpecs(
  items: AIBOMResource[],
  runNames: string[],
  stored: (StoredTelemetry | undefined)[],
  metricKeys: readonly string[],
  labels: Record<string, string>,
  liveEligible: (item: AIBOMResource) => boolean,
  buildQuery: (metricKey: string, podNames: string[]) => string | undefined,
  keyPrefix: string,
): ChartSpec[] {
  return metricKeys.flatMap((metricKey) => {
    const runs: CompareChartRun[] = [];
    let unit: string | undefined;
    items.forEach((item, colorIndex) => {
      const name = runNames[colorIndex];
      const storedMetric = stored[colorIndex]?.metrics[metricKey];
      const storedRun = stored[colorIndex];
      if (storedMetric && storedRun) {
        unit ??= storedMetric.unit;
        runs.push({
          kind: 'stored',
          name,
          colorIndex,
          metric: storedMetric,
          windowStart: storedRun.window.start,
        });
        return;
      }
      if (storedRun) return; // has stored series, just not this metric: don't fall back live
      const namespace = item.metadata?.namespace;
      const { podNames, startMs, endMs, hasWindow } = getTelemetryWindow(item);
      if (!liveEligible(item) || !namespace || !hasWindow) return;
      const query = buildQuery(metricKey, podNames);
      if (!query) return;
      unit ??= LIVE_METRIC_UNITS[metricKey];
      runs.push({ kind: 'live', name, colorIndex, metricKey, query, namespace, startMs, endMs });
    });
    return runs.length > 0
      ? [{ key: `${keyPrefix}-${metricKey}`, title: labels[metricKey] ?? metricKey, unit, runs }]
      : [];
  });
}

const AIBOMCompareTelemetryTab: FC<AIBOMCompareTelemetryTabProps> = ({ items, runNames }) => {
  const { t } = useTranslation('plugin__aibom-console-plugin');
  const [expanded, setExpanded] = useState(false);
  const { loading, byItem } = useStoredTelemetry(items);

  const { hardware, inference } = useMemo(
    () => ({
      hardware: buildChartSpecs(
        items,
        runNames,
        byItem,
        HARDWARE_METRIC_ORDER,
        HARDWARE_METRIC_LABELS,
        (item) => (toFlexNumber(item.spec?.data?.environment?.gpu_count) ?? 0) > 0,
        buildHardwareQuery,
        'hw',
      ),
      inference: buildChartSpecs(
        items,
        runNames,
        byItem,
        INFERENCE_METRIC_ORDER,
        INFERENCE_METRIC_LABELS,
        (item) => item.spec?.data?.inference?.serving_engine === 'vllm',
        buildVllmQuery,
        'inf',
      ),
    }),
    [items, runNames, byItem],
  );

  if (loading) {
    return (
      <Bullseye>
        <Spinner size="xl" aria-label={t('Loading telemetry')} />
      </Bullseye>
    );
  }

  const liveCount = byItem.filter((stored) => !stored).length;

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
                  runs={spec.runs}
                  unit={spec.unit}
                  expanded={expanded}
                />
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
        {liveCount > 0 && (
          <Content component="p">
            {t(
              'Runs without stored telemetry ({{count}}) are queried live; their charts are empty once past Prometheus retention (about 15 days).',
              { count: liveCount },
            )}
          </Content>
        )}
        {runNames.map((name, index) => (
          <Label key={`${name}-${String(index)}`} color={runColor(index)} isCompact>
            {name}
          </Label>
        ))}
        <Switch
          id="aibom-compare-telemetry-expanded"
          label={t('Show individual pods and GPUs')}
          isChecked={expanded}
          onChange={(_event, checked) => {
            setExpanded(checked);
          }}
        />
      </GridItem>
      <Section title={t('Hardware Telemetry')}>
        {renderCharts(hardware, t('No hardware telemetry is available for the compared runs.'))}
      </Section>
      <Section title={t('Inference Telemetry')}>
        {renderCharts(inference, t('Inference telemetry is only available for vLLM workloads.'))}
      </Section>
    </Grid>
  );
};

export default AIBOMCompareTelemetryTab;
