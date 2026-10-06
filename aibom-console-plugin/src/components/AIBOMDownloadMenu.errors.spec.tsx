import { createHash, webcrypto } from 'crypto';
import { k8sGet } from '@openshift-console/dynamic-plugin-sdk';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AIBOMResource } from '../types/aibom';
import { downloadCsv } from '../utils/csv';
import AIBOMDownloadMenu from './AIBOMDownloadMenu';

jest.mock('../utils/csv', () => ({
  ...jest.requireActual<Record<string, unknown>>('../utils/csv'),
  downloadCsv: jest.fn(),
}));
jest.mock('../utils/exportTelemetry', () => ({
  ...jest.requireActual<Record<string, unknown>>('../utils/exportTelemetry'),
  telemetryCsvRows: () => {
    throw new Error('cannot format');
  },
}));

const seriesJson = JSON.stringify({
  schema_version: 1,
  window: { start: 0, end: 60, step_seconds: 30 },
  pods: ['p'],
  metrics: { cpu_usage: { unit: 'cores', aggregate: [[0, 1]] } },
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

describe('AIBOMDownloadMenu build failure', () => {
  beforeAll(() => {
    Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
  });

  it('tells the user when the CSV cannot be built, and re-enables the button', async () => {
    (k8sGet as jest.Mock).mockResolvedValue({ spec: { seriesJson } });
    const user = userEvent.setup();
    render(<AIBOMDownloadMenu items={[item]} />);
    await user.click(screen.getByRole('button', { name: 'Download' }));
    await user.click(screen.getByRole('menuitem', { name: /Telemetry/ }));

    expect(await screen.findByText(/Could not build the telemetry CSV/)).toBeInTheDocument();
    expect(downloadCsv).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Download' })).toBeEnabled();
  });
});
