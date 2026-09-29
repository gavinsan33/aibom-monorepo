import { createHash, webcrypto } from 'crypto';
import { useK8sWatchResources } from '@openshift-console/dynamic-plugin-sdk';
import { render, screen } from '@testing-library/react';
import type { AIBOMResource } from '../../types/aibom';
import AIBOMCompareTelemetryTab from './AIBOMCompareTelemetryTab';

const seriesJson = JSON.stringify({
  schema_version: 1,
  window: { start: 1000, end: 1600, step_seconds: 30 },
  pods: ['a-pod'],
  metrics: {
    gpu_utilization: {
      unit: 'percent',
      aggregation: 'avg',
      aggregate: [
        [1000, 10],
        [1030, 50],
      ],
    },
  },
});

const run = (name: string, gpu: number, stored = false): AIBOMResource => ({
  metadata: { name, namespace: `ns-${name}` },
  spec: {
    collectedAt: '2026-01-01T01:00:00Z',
    data: {
      execution_metadata: {
        pods: [{ pod_name: `${name}-pod`, start_time: '2026-01-01T00:00:00Z' }],
      },
      environment: { gpu_count: gpu },
      ...(stored && {
        telemetry_series_ref: {
          schema_version: 1,
          kind: 'AIBOMTelemetry' as const,
          name: `${name}-telemetry-ab12`,
          sha256: createHash('sha256').update(seriesJson).digest('hex'),
          size_bytes: seriesJson.length,
          window: { start: 1000, end: 1600, step_seconds: 30 },
        },
      }),
    },
  },
});

const mockSeriesObjects = () => {
  (useK8sWatchResources as jest.Mock).mockImplementation((resources: Record<string, unknown>) =>
    Object.fromEntries(
      Object.keys(resources).map((key) => [
        key,
        {
          data: { metadata: { resourceVersion: '1' }, spec: { seriesJson } },
          loaded: true,
          loadError: undefined,
        },
      ]),
    ),
  );
};

describe('AIBOMCompareTelemetryTab', () => {
  beforeAll(() => {
    Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
  });

  it('charts stored series, including GPU metrics, with one legend entry per run', async () => {
    mockSeriesObjects();
    render(
      <AIBOMCompareTelemetryTab
        items={[run('a', 1, true), run('b', 1, true)]}
        runNames={['run-a', 'run-b']}
      />,
    );
    expect((await screen.findAllByText('GPU Utilization')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('run-a')).length).toBeGreaterThan(1); // label + legend
    expect(screen.queryByText(/queried live/)).not.toBeInTheDocument();
    const watched = (useK8sWatchResources as jest.Mock).mock.calls.flatMap(
      ([resources]: [Record<string, unknown>]) => Object.values(resources),
    );
    expect(watched).toContainEqual({
      groupVersionKind: { group: 'aibom.io', version: 'v1alpha1', kind: 'AIBOMTelemetry' },
      namespace: 'ns-a',
      name: 'a-telemetry-ab12',
      isList: false,
    });
  });

  it('falls back to live queries for a run without stored series and says so', async () => {
    render(
      <AIBOMCompareTelemetryTab items={[run('a', 1), run('b', 1)]} runNames={['run-a', 'run-b']} />,
    );
    expect((await screen.findAllByText('CPU Usage')).length).toBeGreaterThan(0);
    expect(screen.getByText(/Runs without stored telemetry/)).toBeInTheDocument();
  });

  it('shows a note instead of charts when nothing qualifies', async () => {
    render(
      <AIBOMCompareTelemetryTab items={[run('a', 0), run('b', 0)]} runNames={['run-a', 'run-b']} />,
    );
    expect(await screen.findByText(/No hardware telemetry is available/)).toBeInTheDocument();
  });
});
