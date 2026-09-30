import type { FC } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Content,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Spinner,
} from '@patternfly/react-core';
import type { AIBOMResource } from '../types/aibom';
import type { StoredTelemetry } from '../types/telemetrySeries';
import { downloadCsv } from '../utils/csv';
import { buildSummaryCsv } from '../utils/exportSummary';
import { LARGE_EXPORT_ROWS, buildTelemetryCsv, countTelemetryRows } from '../utils/exportTelemetry';
import { fetchStoredTelemetry, hasStoredTelemetryRef } from '../utils/fetchStoredTelemetry';

interface AIBOMDownloadMenuProps {
  /** The AIBOMs to export: one on the detail page, the checked rows on the list. */
  items: AIBOMResource[];
}

interface TelemetryEntry {
  item: AIBOMResource;
  stored: StoredTelemetry;
}

/** Concurrent `AIBOMTelemetry` fetches; each object can be up to ~900 KB. */
const FETCH_BATCH = 6;

const stamp = (): string => new Date().toISOString().slice(0, 10);

const fileName = (kind: 'summary' | 'telemetry', items: AIBOMResource[]): string =>
  items.length === 1
    ? `aibom-${kind}-${items[0].metadata?.name ?? 'aibom'}.csv`
    : `aibom-${kind}-${String(items.length)}-aiboms-${stamp()}.csv`;

async function fetchAll(items: AIBOMResource[]): Promise<TelemetryEntry[]> {
  const entries: TelemetryEntry[] = [];
  for (let i = 0; i < items.length; i += FETCH_BATCH) {
    const batch = items.slice(i, i + FETCH_BATCH);
    const results = await Promise.all(batch.map(fetchStoredTelemetry));
    results.forEach((stored, index) => {
      if (stored) entries.push({ item: batch[index], stored });
    });
  }
  return entries;
}

/**
 * "Download" menu with two items, each producing exactly one CSV however many
 * AIBOMs are selected: a wide summary (one row per AIBOM) and a long-format
 * telemetry file (one row per sample). Telemetry is fetched on demand and
 * only covers AIBOMs with stored series; a very large file asks first.
 */
const AIBOMDownloadMenu: FC<AIBOMDownloadMenuProps> = ({ items }) => {
  const { t } = useTranslation('plugin__aibom-console-plugin');
  const [isOpen, setIsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  const [confirm, setConfirm] = useState<{ entries: TelemetryEntry[]; rows: number } | undefined>();

  const eligible = items.filter(hasStoredTelemetryRef);

  const onSummary = () => {
    setMessage(undefined);
    downloadCsv(fileName('summary', items), buildSummaryCsv(items));
  };

  const saveTelemetry = (entries: TelemetryEntry[]) => {
    downloadCsv(
      fileName(
        'telemetry',
        entries.map((e) => e.item),
      ),
      buildTelemetryCsv(entries),
    );
    const skipped = items.length - entries.length;
    setMessage(
      skipped > 0
        ? t(
            'Telemetry CSV includes {{included}} of {{total}} selected; {{skipped}} had no stored telemetry.',
            {
              included: entries.length,
              total: items.length,
              skipped,
            },
          )
        : undefined,
    );
  };

  const onTelemetry = async () => {
    setMessage(undefined);
    setBusy(true);
    try {
      const entries = await fetchAll(eligible);
      if (entries.length === 0) {
        setMessage(t('None of the selected AIBOMs have stored telemetry to download.'));
        return;
      }
      const rows = entries.reduce((sum, e) => sum + countTelemetryRows(e.stored), 0);
      if (rows > LARGE_EXPORT_ROWS) {
        setConfirm({ entries, rows });
      } else {
        saveTelemetry(entries);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Dropdown
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        onSelect={() => {
          setIsOpen(false);
        }}
        toggle={(toggleRef) => (
          <MenuToggle
            ref={toggleRef}
            isExpanded={isOpen}
            isDisabled={busy || items.length === 0}
            icon={busy ? <Spinner size="sm" aria-label={t('Preparing download')} /> : undefined}
            onClick={() => {
              setIsOpen((open) => !open);
            }}
          >
            {t('Download')}
          </MenuToggle>
        )}
        popperProps={{ position: 'right' }}
      >
        <DropdownList>
          <DropdownItem
            key="summary"
            description={t('{{count}} selected', { count: items.length })}
            onClick={onSummary}
          >
            {t('Summary (CSV)')}
          </DropdownItem>
          <DropdownItem
            key="telemetry"
            isDisabled={eligible.length === 0}
            description={
              eligible.length === 0
                ? t('No stored telemetry')
                : t('{{count}} with stored telemetry', { count: eligible.length })
            }
            onClick={() => {
              void onTelemetry();
            }}
          >
            {t('Telemetry (CSV)')}
          </DropdownItem>
        </DropdownList>
      </Dropdown>
      {message && <Content component="small">{message}</Content>}
      {confirm && (
        <Modal
          variant="small"
          isOpen
          onClose={() => {
            setConfirm(undefined);
          }}
        >
          <ModalHeader title={t('Large download')} />
          <ModalBody>
            {t(
              'This telemetry file has about {{rows}} rows and may be slow to open in a spreadsheet. Download anyway?',
              { rows: confirm.rows.toLocaleString() },
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              variant="primary"
              onClick={() => {
                saveTelemetry(confirm.entries);
                setConfirm(undefined);
              }}
            >
              {t('Download')}
            </Button>
            <Button
              variant="link"
              onClick={() => {
                setConfirm(undefined);
              }}
            >
              {t('Cancel')}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </>
  );
};

export default AIBOMDownloadMenu;
