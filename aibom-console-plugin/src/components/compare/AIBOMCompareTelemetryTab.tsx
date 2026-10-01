import type { FC } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
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
import { runColor } from '../../utils/runColors';
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
 * One chart per metric that any compared run has stored series for. Only
 * metrics that returned data are stored, so no GPU/vLLM gating is needed; a
 * run without stored series (or lacking that metric) is simply absent from
 * the chart.
 */
function buildChartSpecs(
  runNames: string[],
  stored: (StoredTelemetry | undefined)[],
  metricKeys: readonly string[],
  labels: Record<string, string>,
  keyPrefix: string,
): ChartSpec[] {
  return metricKeys.flatMap((metricKey) => {
    const runs: CompareChartRun[] = [];
    let unit: string | undefined;
    stored.forEach((run, colorIndex) => {
      const metric = run?.metrics[metricKey];
      if (!run || !metric) return;
      unit ??= metric.unit;
      runs.push({
        name: runNames[colorIndex],
        colorIndex,
        metric,
        windowStart: run.window.start,
        windowEnd: run.window.end,
      });
    });
    return runs.length > 0
      ? [{ key: `${keyPrefix}-${metricKey}`, title: labels[metricKey] ?? metricKey, unit, runs }]
      : [];
  });
}

const AIBOMCompareTelemetryTab: FC<AIBOMCompareTelemetryTabProps> = ({ items, runNames }) => {
  const { t } = useTranslation('plugin__aibom-console-plugin');
  const [expanded, setExpanded] = useState(false);
  const { loading, byItem, mismatched } = useStoredTelemetry(items);

  const { hardware, inference } = useMemo(
    () => ({
      hardware: buildChartSpecs(
        runNames,
        byItem,
        HARDWARE_METRIC_ORDER,
        HARDWARE_METRIC_LABELS,
        'hw',
      ),
      inference: buildChartSpecs(
        runNames,
        byItem,
        INFERENCE_METRIC_ORDER,
        INFERENCE_METRIC_LABELS,
        'inf',
      ),
    }),
    [runNames, byItem],
  );

  if (loading) {
    return (
      <Bullseye>
        <Spinner size="xl" aria-label={t('Loading telemetry')} />
      </Bullseye>
    );
  }

  const nameOf = (index: number): string => runNames[index] ?? String(index);
  // Runs that failed the integrity check get their own warning; the rest just have nothing stored.
  const withoutStored = byItem.flatMap((stored, index) =>
    stored || mismatched.includes(index) ? [] : [nameOf(index)],
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
        {mismatched.length > 0 && (
          <Alert
            variant="warning"
            isInline
            title={t(
              "Stored telemetry doesn't match the AIBOM's recorded digest for: {{runs}}. It was not charted.",
              { runs: mismatched.map(nameOf).join(', ') },
            )}
          />
        )}
        {withoutStored.length > 0 && (
          <Content component="p">
            {t(
              'No usable stored telemetry for: {{runs}}. These runs are left out of the charts (AIBOMs created before telemetry was stored have none).',
              { runs: withoutStored.join(', ') },
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
        {renderCharts(hardware, t('No hardware telemetry is stored for the compared runs.'))}
      </Section>
      <Section title={t('Inference Telemetry')}>
        {renderCharts(inference, t('No inference telemetry is stored for the compared runs.'))}
      </Section>
    </Grid>
  );
};

export default AIBOMCompareTelemetryTab;
