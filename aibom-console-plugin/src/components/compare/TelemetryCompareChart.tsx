import type { FC } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bullseye, Content, Spinner } from '@patternfly/react-core';
import { formatAxisValue, linePath, niceMax } from '../../utils/chartGeometry';
import { formatDuration } from '../../utils/executionMetadata';
import { fetchRange } from '../../utils/prometheusRange';
import type { RangeSeries } from '../../utils/prometheusRange';
import { runChartColor } from '../../utils/runColors';

export interface CompareChartRun {
  name: string;
  /** Index into the compared list, so color matches the tables' `Label`s. */
  colorIndex: number;
  query: string;
  namespace: string;
  startMs: number;
  endMs: number;
}

interface TelemetryCompareChartProps {
  runs: CompareChartRun[];
  units?: string;
}

const WIDTH = 600;
const HEIGHT = 240;
const PAD = { top: 10, right: 12, bottom: 28, left: 64 };
const Y_TICKS = 4;
const X_TICKS = 5;
const TEXT_FILL = 'var(--pf-t--global--text--color--subtle)';
const GRID_STROKE = 'var(--pf-t--global--border--color--default)';

/**
 * One overlaid line chart of the same metric across runs. Runs happened at
 * different times (and possibly in different namespaces), so the x-axis is
 * elapsed time since each run's own start and each run is fetched with its
 * own namespace/window through the tenancy proxy. All of a run's series
 * (pods/containers) share that run's color.
 */
const TelemetryCompareChart: FC<TelemetryCompareChartProps> = ({ runs, units }) => {
  const { t } = useTranslation('plugin__aibom-console-plugin');
  // Outcome tagged with the runs it was fetched for; anything not matching the
  // current `runsKey` counts as still loading.
  const [outcome, setOutcome] = useState<
    { key: string; results?: RangeSeries[][]; error?: string } | undefined
  >();

  // The parent rebuilds `runs` on every resource-watch update; key the fetch on
  // content so an unchanged chart doesn't re-query Prometheus.
  const runsKey = JSON.stringify(runs);

  useEffect(() => {
    let cancelled = false;
    const fetched = JSON.parse(runsKey) as CompareChartRun[];
    Promise.all(fetched.map((r) => fetchRange(r.query, r.namespace, r.startMs, r.endMs)))
      .then((res) => {
        if (!cancelled) setOutcome({ key: runsKey, results: res });
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setOutcome({ key: runsKey, error: e instanceof Error ? e.message : String(e) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [runsKey]);

  const current = outcome?.key === runsKey ? outcome : undefined;
  const results = current?.results;
  const error = current?.error;

  const model = useMemo(() => {
    if (!results) return undefined;
    const points = results.flatMap((series) => series.flatMap((s) => s.points));
    if (points.length === 0) return undefined;
    const xMax = Math.max(...runs.map((r) => (r.endMs - r.startMs) / 1000));
    const yMax = niceMax(Math.max(...points.map((p) => p.y)));
    const xScale = (x: number) => PAD.left + (x / xMax) * (WIDTH - PAD.left - PAD.right);
    const yScale = (y: number) =>
      HEIGHT - PAD.bottom - (y / yMax) * (HEIGHT - PAD.top - PAD.bottom);
    return { xMax, yMax, xScale, yScale };
  }, [results, runs]);

  if (error) {
    return <Content component="p">{t('Unable to load telemetry: {{error}}', { error })}</Content>;
  }
  if (!results) {
    return (
      <Bullseye>
        <Spinner size="lg" aria-label={t('Loading telemetry')} />
      </Bullseye>
    );
  }
  if (!model) {
    return <Content component="p">{t('No data returned for this metric')}</Content>;
  }

  const { xMax, yMax, xScale, yScale } = model;
  return (
    <svg
      viewBox={['0', '0', WIDTH, HEIGHT].join(' ')}
      width="100%"
      role="img"
      aria-label={runs.map((r) => r.name).join(', ')}
    >
      {Array.from({ length: Y_TICKS + 1 }, (_, i) => {
        const value = (yMax * i) / Y_TICKS;
        const y = yScale(value);
        return (
          <g key={`y${String(i)}`}>
            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y} y2={y} stroke={GRID_STROKE} />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="11" fill={TEXT_FILL}>
              {formatAxisValue(value, units)}
            </text>
          </g>
        );
      })}
      {Array.from({ length: X_TICKS + 1 }, (_, i) => {
        const seconds = (xMax * i) / X_TICKS;
        return (
          <text
            key={`x${String(i)}`}
            x={xScale(seconds)}
            y={HEIGHT - 8}
            textAnchor="middle"
            fontSize="11"
            fill={TEXT_FILL}
          >
            {formatDuration(seconds)}
          </text>
        );
      })}
      {runs.map((run, runIndex) =>
        results[runIndex].map((series, seriesIndex) => (
          <path
            key={`${String(run.colorIndex)}-${String(seriesIndex)}`}
            role="graphics-symbol"
            aria-label={run.name}
            d={linePath(series.points, xScale, yScale)}
            fill="none"
            stroke={runChartColor(run.colorIndex)}
            strokeWidth="1.5"
          />
        )),
      )}
    </svg>
  );
};

export default TelemetryCompareChart;
