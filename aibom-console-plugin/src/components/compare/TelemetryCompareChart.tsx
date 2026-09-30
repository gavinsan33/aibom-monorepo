import type { FC } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Content } from '@patternfly/react-core';
import type { StoredMetric } from '../../types/telemetrySeries';
import { linesFromStored } from '../../utils/compareLines';
import TelemetryLineChart from './TelemetryLineChart';

/** One run's stored series for a metric. */
export interface CompareChartRun {
  name: string;
  /** Index into the compared list, so color matches the tables' `Label`s. */
  colorIndex: number;
  metric: StoredMetric;
  /** Unix seconds; x is measured from here. */
  windowStart: number;
}

interface TelemetryCompareChartProps {
  title: string;
  runs: CompareChartRun[];
  unit?: string;
  /** Draw each run's pods/GPUs individually instead of one aggregate line. */
  expanded: boolean;
}

/**
 * One metric across runs, from the series stored with each AIBOM. Runs
 * happened at different times, so each line is plotted against elapsed time
 * since its own start.
 */
const TelemetryCompareChart: FC<TelemetryCompareChartProps> = ({ title, runs, unit, expanded }) => {
  const { t } = useTranslation('plugin__aibom-console-plugin');
  const lines = useMemo(
    () =>
      runs.flatMap((run) =>
        linesFromStored(run.metric, run.windowStart, expanded, run.name, run.colorIndex),
      ),
    [runs, expanded],
  );

  if (lines.every((line) => line.points.length === 0)) {
    return <Content component="p">{t('No data was stored for this metric')}</Content>;
  }

  return (
    <TelemetryLineChart
      title={title}
      lines={lines}
      legend={runs.map(({ name, colorIndex }) => ({ name, colorIndex }))}
      unit={unit}
    />
  );
};

export default TelemetryCompareChart;
