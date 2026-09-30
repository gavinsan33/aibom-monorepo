import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  Chart,
  ChartAxis,
  ChartLine,
  ChartVoronoiContainer,
} from '@patternfly/react-charts/victory';
import type { ChartLine as ChartLineModel } from '../../utils/compareLines';
import { formatDuration } from '../../utils/executionMetadata';
import { formatMetricValue } from '../../utils/formatMetricValue';
import { runChartColor } from '../../utils/runColors';

interface TelemetryLineChartProps {
  title: string;
  lines: ChartLineModel[];
  /** One legend entry per compared run (not per expanded series). */
  legend: { name: string; colorIndex: number }[];
  unit?: string;
}

const HEIGHT = 300;
const FALLBACK_WIDTH = 600;
const PADDING = { top: 16, right: 24, bottom: 80, left: 80 };

/** Tracks the container's width so the (fixed-size) Victory chart fills its card. */
function useContainerWidth(): [React.RefObject<HTMLDivElement>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(FALLBACK_WIDTH);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);
  return [ref, width];
}

const tooltipLabel =
  (unit?: string) =>
  ({ datum }: { datum: { x: number; y: number; name: string } }): string =>
    `${datum.name}\n${formatMetricValue(datum.y, unit)} at ${formatDuration(datum.x) ?? '0s'}`;

/**
 * Multi-run line chart on PatternFly's chart library. The x-axis is elapsed
 * time since each run's own start; every line is drawn in its run's color
 * (`runChartColor`), the same one its table `Label` uses.
 */
const TelemetryLineChart: FC<TelemetryLineChartProps> = ({ title, lines, legend, unit }) => {
  const [ref, width] = useContainerWidth();
  return (
    <div ref={ref}>
      <Chart
        ariaTitle={title}
        width={width}
        height={HEIGHT}
        padding={PADDING}
        minDomain={{ y: 0 }}
        legendData={legend.map((run) => ({
          name: run.name,
          symbol: { fill: runChartColor(run.colorIndex) },
        }))}
        legendPosition="bottom"
        legendAllowWrap
        containerComponent={
          <ChartVoronoiContainer constrainToVisibleArea labels={tooltipLabel(unit)} />
        }
      >
        <ChartAxis
          tickCount={5}
          fixLabelOverlap
          tickFormat={(x: number) => formatDuration(x) ?? '0s'}
        />
        <ChartAxis dependentAxis showGrid tickFormat={(y: number) => formatMetricValue(y, unit)} />
        {lines.map((line, i) => (
          <ChartLine
            key={`${line.name}-${String(i)}`}
            data={line.points.map((p) => ({ x: p.x, y: p.y, name: line.name }))}
            style={{
              data: {
                stroke: runChartColor(line.colorIndex),
                strokeWidth: 1.5,
                strokeDasharray: line.dash,
              },
            }}
          />
        ))}
      </Chart>
    </div>
  );
};

export default TelemetryLineChart;
