import type { FC } from 'react';
import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Spinner } from '@patternfly/react-core';

interface MetricPoint {
  timestamp: number;
  [key: string]: number;
}

interface TelemetryChartProps {
  query: string;
  namespace: string;
  startTime: number;
  endTime: number;
  unit?: string;
  showLegend?: boolean;
}

const TelemetryChart: FC<TelemetryChartProps> = ({
  query,
  namespace,
  startTime,
  endTime,
  unit,
  showLegend = true,
}) => {
  const [data, setData] = useState<MetricPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        setError(null);

        const start = Math.floor(startTime / 1000);
        const end = Math.floor(endTime / 1000);
        const step = Math.max(1, Math.floor((end - start) / 300)); // ~300 points max

        const url = `/api/prometheus-tenancy/api/v1/query_range?query=${encodeURIComponent(
          query
        )}&start=${start}&end=${end}&step=${step}&namespace=${namespace}`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Prometheus query failed: ${response.statusText}`);
        }

        const result = await response.json();
        if (result.status !== 'success') {
          throw new Error(result.error || 'Unknown error');
        }

        const chartData: MetricPoint[] = [];
        const timepoints = new Map<number, MetricPoint>();

        result.data.result?.forEach((series: any) => {
          const labels = series.metric;
          const seriesName = labels.pod || Object.values(labels).filter((v) => v)[0] || 'metric';

          series.values?.forEach(([timestamp, value]: [number, string]) => {
            const ts = timestamp * 1000;
            if (!timepoints.has(ts)) {
              timepoints.set(ts, { timestamp: ts });
            }
            timepoints.get(ts)![String(seriesName)] = parseFloat(value);
          });
        });

        chartData.push(
          ...Array.from(timepoints.values()).sort((a, b) => a.timestamp - b.timestamp)
        );
        setData(chartData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [query, namespace, startTime, endTime]);

  if (loading) return <Spinner />;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;
  if (data.length === 0) return <div>No data available</div>;

  const metricKeys = Object.keys(data[0]).filter((k) => k !== 'timestamp');
  const colors = ['#0066CC', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="timestamp"
          type="number"
          domain={[data[0]?.timestamp, data[data.length - 1]?.timestamp]}
          tickFormatter={(ts) => new Date(ts).toLocaleTimeString()}
        />
        <YAxis label={{ value: unit || 'value', angle: -90, position: 'insideLeft' }} />
        <Tooltip
          labelFormatter={(ts) => new Date(ts).toLocaleString()}
          formatter={(value) => [value?.toFixed(2), '']}
        />
        {showLegend && <Legend />}
        {metricKeys.map((key, i) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={colors[i % colors.length]}
            dot={false}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};

export default TelemetryChart;
