import type { FC } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bullseye, Content, Spinner } from '@patternfly/react-core';
import type { StoredMetric } from '../../types/telemetrySeries';
import { linesFromLive, linesFromStored } from '../../utils/compareLines';
import type { ChartLine } from '../../utils/compareLines';
import { fetchRange } from '../../utils/prometheusRange';
import type { RangeSeries } from '../../utils/prometheusRange';
import TelemetryLineChart from './TelemetryLineChart';

interface RunBase {
  name: string;
  /** Index into the compared list, so color matches the tables' `Label`s. */
  colorIndex: number;
}

/** Series stored with the AIBOM (survives Prometheus retention). */
export interface StoredChartRun extends RunBase {
  kind: 'stored';
  metric: StoredMetric;
  /** Unix seconds; x is measured from here. */
  windowStart: number;
}

/** Fallback for AIBOMs without stored series: query the tenancy proxy now. */
export interface LiveChartRun extends RunBase {
  kind: 'live';
  metricKey: string;
  query: string;
  namespace: string;
  startMs: number;
  endMs: number;
}

export type CompareChartRun = StoredChartRun | LiveChartRun;

interface TelemetryCompareChartProps {
  title: string;
  runs: CompareChartRun[];
  unit?: string;
  /** Draw each run's pods/GPUs individually instead of one aggregate line. */
  expanded: boolean;
}

/**
 * One metric across runs. Stored runs draw immediately; live runs are
 * fetched first. Runs happened at different times (and maybe namespaces), so
 * each line is plotted against elapsed time since its own start.
 */
const TelemetryCompareChart: FC<TelemetryCompareChartProps> = ({ title, runs, unit, expanded }) => {
  const { t } = useTranslation('plugin__aibom-console-plugin');
  const liveRuns = useMemo(
    () => runs.filter((run): run is LiveChartRun => run.kind === 'live'),
    [runs],
  );

  // Outcome tagged with the live runs it was fetched for; anything not
  // matching the current key counts as still loading. Keyed on content because
  // the parent rebuilds `runs` on every resource-watch update.
  const liveKey = JSON.stringify(liveRuns);
  const [outcome, setOutcome] = useState<
    { key: string; results?: RangeSeries[][]; error?: string } | undefined
  >();

  useEffect(() => {
    if (liveRuns.length === 0) return undefined;
    let cancelled = false;
    const fetched = JSON.parse(liveKey) as LiveChartRun[];
    Promise.all(fetched.map((r) => fetchRange(r.query, r.namespace, r.startMs, r.endMs)))
      .then((results) => {
        if (!cancelled) setOutcome({ key: liveKey, results });
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setOutcome({ key: liveKey, error: e instanceof Error ? e.message : String(e) });
        }
      });
    return () => {
      cancelled = true;
    };
    // `liveRuns` is derived from `liveKey`'s content; the key is the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveKey]);

  const current = outcome?.key === liveKey ? outcome : undefined;
  const loading = liveRuns.length > 0 && !current;

  const lines = useMemo<ChartLine[]>(() => {
    let liveIndex = 0;
    return runs.flatMap((run) => {
      if (run.kind === 'stored') {
        return linesFromStored(run.metric, run.windowStart, expanded, run.name, run.colorIndex);
      }
      const series = current?.results?.[liveIndex++];
      return series ? linesFromLive(series, run.metricKey, expanded, run.name, run.colorIndex) : [];
    });
  }, [runs, current, expanded]);

  if (current?.error && lines.length === 0) {
    return (
      <Content component="p">
        {t('Unable to load telemetry: {{error}}', { error: current.error })}
      </Content>
    );
  }
  if (loading) {
    return (
      <Bullseye>
        <Spinner size="lg" aria-label={t('Loading telemetry')} />
      </Bullseye>
    );
  }
  if (lines.every((line) => line.points.length === 0)) {
    return <Content component="p">{t('No data returned for this metric')}</Content>;
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
