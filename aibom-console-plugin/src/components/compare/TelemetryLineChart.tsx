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

const PLOT_HEIGHT = 220;
const FALLBACK_WIDTH = 600;
const PADDING = { top: 16, right: 24, left: 80 };
/** Room under the plot for the x-axis ticks before the legend starts. */
const AXIS_ALLOWANCE = 50;
const LEGEND_ROW_HEIGHT = 28;
const LEGEND_CHAR_WIDTH = 7.5;
const LEGEND_ITEM_CHROME = 40;

/**
 * Victory wraps the legend but doesn't grow the chart to fit it, so long run
 * names were clipped at the bottom. Estimate the wrapped row count (greedy
 * packing by approximate text width) so the chart can reserve the space.
 */
const legendRowCount = (names: string[], availableWidth: number): number => {
  let rows = 1;
  let used = 0;
  names.forEach((name) => {
    const itemWidth = name.length * LEGEND_CHAR_WIDTH + LEGEND_ITEM_CHROME;
    if (used > 0 && used + itemWidth > availableWidth) {
      rows += 1;
      used = 0;
    }
    used += itemWidth;
  });
  return rows;
};

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
  const rows = legendRowCount(
    legend.map((run) => run.name),
    width - PADDING.left - PADDING.right,
  );
  const bottom = AXIS_ALLOWANCE + rows * LEGEND_ROW_HEIGHT;
  return (
    <div ref={ref}>
      <Chart
        ariaTitle={title}
        width={width}
        height={PLOT_HEIGHT + PADDING.top + bottom}
        padding={{ ...PADDING, bottom }}
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
