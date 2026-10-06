import { render } from '@testing-library/react';
import TelemetryCompareChart from './TelemetryCompareChart';

const mockLineChart = jest.fn<null, [unknown]>(() => null);
jest.mock('./TelemetryLineChart', () => ({
  __esModule: true,
  default: (props: unknown) => mockLineChart(props),
}));

const runs = [
  {
    name: 'run',
    colorIndex: 0,
    windowStart: 1000,
    windowEnd: 1600,
    metric: {
      aggregate: [
        [1500, 1],
        [1530, 2],
      ] as [number, number][],
    },
  },
];

describe('TelemetryCompareChart x range', () => {
  beforeEach(() => {
    mockLineChart.mockClear();
  });

  it('uses the shared window as the x range by default', () => {
    render(<TelemetryCompareChart title="TTFT" runs={runs} expanded={false} />);
    expect(mockLineChart).toHaveBeenCalledWith(expect.objectContaining({ xMax: 600 }));
  });

  it('leaves the x range to the chart when fitting to data', () => {
    render(<TelemetryCompareChart title="TTFT" runs={runs} expanded={false} fitToData />);
    expect(mockLineChart).toHaveBeenCalledWith(expect.objectContaining({ xMax: undefined }));
  });
});
