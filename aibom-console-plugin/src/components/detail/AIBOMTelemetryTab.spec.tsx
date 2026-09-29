import { render, screen } from '@testing-library/react';
import type { AIBOMResource } from '../../types/aibom';
import AIBOMTelemetryTab from './AIBOMTelemetryTab';

function withPods(
  overrides: Partial<NonNullable<AIBOMResource['spec']>['data']> = {},
): AIBOMResource {
  return {
    metadata: { name: 'run-a', namespace: 'ns' },
    spec: {
      collectedAt: '2026-01-01T01:00:00Z',
      data: {
        execution_metadata: {
          pods: [{ pod_name: 'pod-a', start_time: '2026-01-01T00:00:00Z' }],
        },
        environment: { gpu_count: 0 },
        ...overrides,
      },
    },
  };
}

describe('AIBOMTelemetryTab', () => {
  it('shows an empty state when there are no pods', () => {
    render(
      <AIBOMTelemetryTab
        item={{ metadata: { name: 'run-a', namespace: 'ns' }, spec: { data: {} } }}
      />,
    );
    expect(screen.getByText('No pod data available for telemetry')).toBeInTheDocument();
  });

  it('shows a no-GPU message instead of hardware charts when gpu_count is 0', () => {
    render(<AIBOMTelemetryTab item={withPods({ environment: { gpu_count: 0 } })} />);
    expect(screen.getByText(/No GPU detected/)).toBeInTheDocument();
    expect(screen.queryByText('GPU Utilization')).not.toBeInTheDocument();
  });

  it('renders non-GPU hardware charts plus an explanatory note when a GPU is present', () => {
    render(<AIBOMTelemetryTab item={withPods({ environment: { gpu_count: 1 } })} />);
    expect(screen.getByText(/Live GPU charts are unavailable/)).toBeInTheDocument();
    expect(screen.queryByText('GPU Utilization')).not.toBeInTheDocument();
    expect(screen.getByText('CPU Usage')).toBeInTheDocument();
    expect(
      screen.getByText(
        'rate(container_cpu_usage_seconds_total{pod=~"pod-a", container!="POD", container!=""}[5m])',
      ),
    ).toBeInTheDocument();
  });

  it('shows a vLLM-only message instead of inference charts for a non-vLLM workload', () => {
    render(<AIBOMTelemetryTab item={withPods({ environment: { gpu_count: 1 } })} />);
    expect(screen.getByText(/only available for vLLM workloads/)).toBeInTheDocument();
  });

  it('renders inference charts for a vLLM workload', () => {
    render(
      <AIBOMTelemetryTab
        item={withPods({ environment: { gpu_count: 1 }, inference: { serving_engine: 'vllm' } })}
      />,
    );
    expect(screen.getByText('TTFT')).toBeInTheDocument();
  });
});
