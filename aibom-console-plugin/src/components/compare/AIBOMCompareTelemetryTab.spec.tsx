import { render, screen } from '@testing-library/react';
import type { AIBOMResource } from '../../types/aibom';
import AIBOMCompareTelemetryTab from './AIBOMCompareTelemetryTab';

const run = (name: string, namespace: string, gpu: number): AIBOMResource => ({
  metadata: { name, namespace },
  spec: {
    collectedAt: '2026-01-01T01:00:00Z',
    data: {
      execution_metadata: {
        pods: [{ pod_name: `${name}-pod`, start_time: '2026-01-01T00:00:00Z' }],
      },
      environment: { gpu_count: gpu },
    },
  },
});

describe('AIBOMCompareTelemetryTab', () => {
  it('overlays every run on one chart, each in its own color', async () => {
    render(
      <AIBOMCompareTelemetryTab
        items={[run('a', 'ns-a', 1), run('b', 'ns-b', 1)]}
        runNames={['run-a', 'run-b']}
      />,
    );
    const [lineA] = await screen.findAllByRole('graphics-symbol', { name: 'run-a' });
    const [lineB] = await screen.findAllByRole('graphics-symbol', { name: 'run-b' });
    expect(lineA.getAttribute('stroke')).not.toBe(lineB.getAttribute('stroke'));
  });

  it('leaves a run out of hardware charts when it has no GPU', async () => {
    render(
      <AIBOMCompareTelemetryTab
        items={[run('a', 'ns-a', 1), run('b', 'ns-b', 0)]}
        runNames={['run-a', 'run-b']}
      />,
    );
    expect(
      (await screen.findAllByRole('graphics-symbol', { name: 'run-a' })).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByRole('graphics-symbol', { name: 'run-b' })).not.toBeInTheDocument();
  });

  it('shows a note instead of charts when no run qualifies', () => {
    render(
      <AIBOMCompareTelemetryTab
        items={[run('a', 'ns-a', 0), run('b', 'ns-b', 0)]}
        runNames={['run-a', 'run-b']}
      />,
    );
    expect(screen.getByText(/No compared run has a GPU/)).toBeInTheDocument();
  });
});
