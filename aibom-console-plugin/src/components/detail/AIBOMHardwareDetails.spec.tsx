import { fireEvent, render, screen } from '@testing-library/react';
import AIBOMHardwareDetails from './AIBOMHardwareDetails';

const environment = {
  gpu_memory_mb: [81920, 81920],
  cpu: { cpu_architecture: 'x86_64', cache_l3: '24 MiB' },
  storage: { block_devices: 'nvme0n1 894G\nsda 1T' },
  benchmarks: { cpu_compute: { mflops: '100.00' } },
};

describe('AIBOMHardwareDetails', () => {
  it('renders nothing when the AIBOM predates the fields', () => {
    const { container } = render(<AIBOMHardwareDetails environment={{ gpu_type: 'A100' }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('is collapsed until toggled, then shows formatted groups and a benchmarks table', () => {
    render(<AIBOMHardwareDetails environment={environment} />);
    expect(screen.queryByText('x86_64')).not.toBeVisible();

    fireEvent.click(screen.getByText('Show hardware details'));

    expect(screen.getByText('2 × 80 GiB')).toBeVisible();
    expect(screen.getByText('x86_64')).toBeVisible();
    expect(screen.getByText('nvme0n1 894G, sda 1T')).toBeVisible();
    expect(screen.getByRole('columnheader', { name: 'Benchmark' })).toBeVisible();
    expect(screen.getByText('Cpu compute')).toBeVisible();
    expect(screen.getByText('100.00')).toBeVisible();
  });
});
