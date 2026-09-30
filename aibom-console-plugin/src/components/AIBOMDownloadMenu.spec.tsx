import { createHash, webcrypto } from 'crypto';
import { k8sGet } from '@openshift-console/dynamic-plugin-sdk';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AIBOMResource } from '../types/aibom';
import { downloadCsv } from '../utils/csv';
import AIBOMDownloadMenu from './AIBOMDownloadMenu';

const downloadMock = downloadCsv as jest.MockedFunction<typeof downloadCsv>;

jest.mock('../utils/csv', () => ({
  ...jest.requireActual<Record<string, unknown>>('../utils/csv'),
  downloadCsv: jest.fn(),
}));

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

const plain = (name: string): AIBOMResource => ({
  metadata: { name, namespace: 'ns' },
  spec: { jobName: `job-${name}`, data: { model: { name: 'granite' } } },
});

const withSeries = (name: string): AIBOMResource => ({
  metadata: { name, namespace: 'ns' },
  spec: {
    jobName: `job-${name}`,
    data: {
      telemetry_series_ref: {
        schema_version: 1,
        kind: 'AIBOMTelemetry',
        name: `${name}-telemetry-ab12`,
        sha256: createHash('sha256').update(seriesJson).digest('hex'),
        size_bytes: seriesJson.length,
        window: { start: 0, end: 60, step_seconds: 30 },
      },
    },
  },
});

/** The CSV passed to `downloadCsv`, whether as one string or as chunks. */
const savedCsv = (call: number): string => [downloadMock.mock.calls[call][1]].flat().join('');

describe('AIBOMDownloadMenu', () => {
  beforeAll(() => {
    Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('downloads one summary file for however many AIBOMs are selected', async () => {
    const user = userEvent.setup();
    render(<AIBOMDownloadMenu items={[plain('a'), plain('b'), plain('c')]} />);
    await user.click(screen.getByRole('button', { name: 'Download' }));
    await user.click(screen.getByRole('menuitem', { name: /Summary/ }));

    expect(downloadCsv).toHaveBeenCalledTimes(1);
    expect(downloadMock.mock.calls[0][0]).toBe(
      'aibom-summary-3-aiboms-' + new Date().toISOString().slice(0, 10) + '.csv',
    );
    expect(savedCsv(0).trim().split('\r\n')).toHaveLength(4); // header + 3 rows
  });

  it('disables the telemetry item when no selected AIBOM has stored telemetry', async () => {
    const user = userEvent.setup();
    render(<AIBOMDownloadMenu items={[plain('a')]} />);
    await user.click(screen.getByRole('button', { name: 'Download' }));
    expect(screen.getByRole('menuitem', { name: /Telemetry/ })).toBeDisabled();
  });

  it('fetches stored series on demand and reports the AIBOMs it skipped', async () => {
    (k8sGet as jest.Mock).mockResolvedValue({ spec: { seriesJson } });
    const user = userEvent.setup();
    render(<AIBOMDownloadMenu items={[withSeries('a'), plain('b')]} />);
    await user.click(screen.getByRole('button', { name: 'Download' }));
    await user.click(screen.getByRole('menuitem', { name: /Telemetry/ }));

    await waitFor(() => {
      expect(downloadCsv).toHaveBeenCalledTimes(1);
    });
    expect(k8sGet).toHaveBeenCalledTimes(1); // only the AIBOM with a reference
    expect(downloadMock.mock.calls[0][0]).toBe('aibom-telemetry-a.csv');
    expect(savedCsv(0)).toContain('ns/a,job-a');
    expect(savedCsv(0)).toContain('cpu_usage,cores,aggregate');
    expect(await screen.findByText(/includes/)).toBeInTheDocument();
  });

  it.each([
    ['a 403', Object.assign(new Error('forbidden'), { code: 403 }), /permission denied/],
    ['a 404', Object.assign(new Error('gone'), { code: 404 }), /no longer exists/],
    ['a network error', new Error('boom'), /failed to load/],
  ])('says why nothing downloaded on %s', async (_label, error, reason) => {
    (k8sGet as jest.Mock).mockRejectedValue(error);
    const user = userEvent.setup();
    render(<AIBOMDownloadMenu items={[withSeries('a')]} />);
    await user.click(screen.getByRole('button', { name: 'Download' }));
    await user.click(screen.getByRole('menuitem', { name: /Telemetry/ }));

    expect(await screen.findByText(/Nothing was downloaded/)).toBeInTheDocument();
    expect(screen.getByText(reason)).toBeInTheDocument();
    expect(downloadCsv).not.toHaveBeenCalled();
  });

  it('reports a payload that fails the digest check as invalid, not as missing', async () => {
    (k8sGet as jest.Mock).mockResolvedValue({ spec: { seriesJson: seriesJson + ' ' } });
    const user = userEvent.setup();
    render(<AIBOMDownloadMenu items={[withSeries('a')]} />);
    await user.click(screen.getByRole('button', { name: 'Download' }));
    await user.click(screen.getByRole('menuitem', { name: /Telemetry/ }));

    expect(await screen.findByText(/integrity check/)).toBeInTheDocument();
    expect(downloadCsv).not.toHaveBeenCalled();
  });
});
