import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { AIBOMResource } from '../types/aibom';
import AIBOMListTable from './AIBOMListTable';

const renderWithRouter = (ui: ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

function item(name: string): AIBOMResource {
  return {
    metadata: { name, namespace: 'ns' },
    spec: {
      jobName: 'job-a',
      experimentIntent: 'training',
      collectedAt: '2026-01-01T00:00:00Z',
      data: {
        model: { name: 'granite-3.0-8b', quantization: 'int4' },
        environment: { gpu_type: 'A100' },
        resource_utilization: { metrics: { gpu_utilization: { avg: 42, unit: '%' } } },
      },
    },
  };
}

describe('AIBOMListTable', () => {
  it('renders the base columns, not a metric column, when sorting by age', () => {
    renderWithRouter(
      <AIBOMListTable items={[item('run-a')]} sortKey="age" ascending={false} onSort={jest.fn()} />,
    );
    expect(screen.getByText('Job')).toBeInTheDocument();
    expect(screen.getByText('granite-3.0-8b')).toBeInTheDocument();
    expect(screen.queryByText('gpu-utilization')).not.toBeInTheDocument();
  });

  it('adds a metric column when sorting by a performance metric', () => {
    renderWithRouter(
      <AIBOMListTable
        items={[item('run-a')]}
        sortKey="gpu-utilization"
        ascending={false}
        onSort={jest.fn()}
      />,
    );
    expect(screen.getByText('gpu-utilization')).toBeInTheDocument();
    expect(screen.getByText('42.00 %')).toBeInTheDocument();
  });
});
