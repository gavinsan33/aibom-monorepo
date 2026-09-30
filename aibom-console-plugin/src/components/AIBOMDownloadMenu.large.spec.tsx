import { createHash, webcrypto } from 'crypto';
import { k8sGet } from '@openshift-console/dynamic-plugin-sdk';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AIBOMResource } from '../types/aibom';
import { downloadCsv } from '../utils/csv';
import AIBOMDownloadMenu from './AIBOMDownloadMenu';

jest.mock('../utils/csv', () => ({
  ...jest.requireActual<Record<string, unknown>>('../utils/csv'),
  downloadCsv: jest.fn(),
}));
// Lower the threshold so a tiny fixture counts as "large".
jest.mock('../utils/exportTelemetry', () => ({
  ...jest.requireActual<Record<string, unknown>>('../utils/exportTelemetry'),
  LARGE_EXPORT_ROWS: 1,
}));

const downloadMock = downloadCsv as jest.MockedFunction<typeof downloadCsv>;

const seriesJson = JSON.stringify({
  schema_version: 1,
  window: { start: 0, end: 60, step_seconds: 30 },
  pods: ['p'],
  metrics: {
    cpu_usage: {
      unit: 'cores',
      aggregation: 'sum',
      aggregate: [
        [0, 1],
        [30, 2],
      ],
    },
  },
});

const item: AIBOMResource = {
  metadata: { name: 'a', namespace: 'ns' },
  spec: {
    data: {
      telemetry_series_ref: {
        schema_version: 1,
        kind: 'AIBOMTelemetry',
        name: 'a-telemetry-ab12',
        sha256: createHash('sha256').update(seriesJson).digest('hex'),
        size_bytes: seriesJson.length,
        window: { start: 0, end: 60, step_seconds: 30 },
      },
    },
  },
};

describe('AIBOMDownloadMenu large telemetry download', () => {
  beforeAll(() => {
    Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (k8sGet as jest.Mock).mockResolvedValue({ spec: { seriesJson } });
  });

  async function requestTelemetry() {
    const user = userEvent.setup();
    render(<AIBOMDownloadMenu items={[item]} />);
    await user.click(screen.getByRole('button', { name: 'Download' }));
    await user.click(screen.getByRole('menuitem', { name: /Telemetry/ }));
    return user;
  }

  it('asks before saving, and saves once confirmed', async () => {
    const user = await requestTelemetry();
    expect(await screen.findByText(/may be slow to open/)).toBeInTheDocument();
    expect(downloadMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Download' }));
    await waitFor(() => {
      expect(downloadMock).toHaveBeenCalledTimes(1);
    });
  });

  it('saves nothing when cancelled', async () => {
    const user = await requestTelemetry();
    await screen.findByText(/may be slow to open/);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(downloadMock).not.toHaveBeenCalled();
  });
});
