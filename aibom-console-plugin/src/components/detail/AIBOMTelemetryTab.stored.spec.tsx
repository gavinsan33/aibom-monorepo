import { createHash, webcrypto } from 'crypto';
import { useK8sWatchResources } from '@openshift-console/dynamic-plugin-sdk';
import { render, screen } from '@testing-library/react';
import type { AIBOMResource } from '../../types/aibom';
import AIBOMTelemetryTab from './AIBOMTelemetryTab';

const payload = (metrics: Record<string, unknown>): string =>
  JSON.stringify({
    schema_version: 1,
    window: { start: 1000, end: 1600, step_seconds: 30 },
    pods: ['a-pod'],
    metrics,
  });

const gpuMetrics = {
  gpu_utilization: {
    unit: 'percent',
    aggregation: 'avg',
    aggregate: [
      [1000, 10],
      [1030, 50],
    ],
  },
};

const cpuMetrics = {
  cpu_usage: {
    unit: 'cores',
    aggregation: 'sum',
    aggregate: [
      [1000, 1],
      [1030, 2],
    ],
  },
};

/** An AIBOM whose reference matches `stored`, and (unless `refPayload` says otherwise) the watched object serves exactly that text. */
function run(stored: string, opts: { gpu?: number; refPayload?: string } = {}): AIBOMResource {
  const refFor = opts.refPayload ?? stored;
  return {
    metadata: { name: 'run-a', namespace: 'ns' },
    spec: {
      jobName: 'job-a',
      collectedAt: '2026-01-01T01:00:00Z',
      data: {
        execution_metadata: {
          pods: [{ pod_name: 'pod-a', start_time: '2026-01-01T00:00:00Z' }],
        },
        environment: { gpu_count: opts.gpu ?? 1 },
        telemetry_series_ref: {
          schema_version: 1,
          kind: 'AIBOMTelemetry',
          name: 'run-a-telemetry-ab12',
          sha256: createHash('sha256').update(refFor).digest('hex'),
          size_bytes: Buffer.byteLength(refFor),
          window: { start: 1000, end: 1600, step_seconds: 30 },
        },
      },
    },
  };
}

const serve = (seriesJson: string) => {
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

describe('AIBOMTelemetryTab with stored series', () => {
  beforeAll(() => {
    Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
  });

  it('charts stored GPU metrics and skips the live GPU-unavailable note and queries', async () => {
    const stored = payload({ ...gpuMetrics, ...cpuMetrics });
    serve(stored);
    render(<AIBOMTelemetryTab item={run(stored)} />);

    expect((await screen.findAllByText('GPU Utilization')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('CPU Usage').length).toBeGreaterThan(0);
    expect(screen.queryByText(/Live GPU charts are unavailable/)).not.toBeInTheDocument();
    expect(screen.queryByText(/container_cpu_usage_seconds_total/)).not.toBeInTheDocument();
  });

  it('says so when a GPU workload has no stored GPU series', async () => {
    const stored = payload(cpuMetrics);
    serve(stored);
    render(<AIBOMTelemetryTab item={run(stored, { gpu: 2 })} />);

    expect(await screen.findByText(/No GPU series were stored/)).toBeInTheDocument();
    expect(screen.getAllByText('CPU Usage').length).toBeGreaterThan(0);
  });

  it('warns and falls back to live charts when the stored copy fails its digest', async () => {
    const served = payload(gpuMetrics);
    const recorded = payload(cpuMetrics); // reference describes different content
    serve(served);
    render(<AIBOMTelemetryTab item={run(served, { refPayload: recorded })} />);

    expect(
      await screen.findByText(/doesn't match the AIBOM's recorded digest/),
    ).toBeInTheDocument();
    expect(await screen.findByText(/container_cpu_usage_seconds_total/)).toBeInTheDocument();
  });

  it('goes straight to live charts, with no spinner, when the AIBOM has no reference', () => {
    const noRef = run(payload(cpuMetrics));
    delete noRef.spec?.data?.telemetry_series_ref;
    render(<AIBOMTelemetryTab item={noRef} />);

    expect(screen.queryByLabelText('Loading telemetry')).not.toBeInTheDocument();
    expect(screen.getByText(/container_cpu_usage_seconds_total/)).toBeInTheDocument();
  });
});
