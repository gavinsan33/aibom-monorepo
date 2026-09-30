import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
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
import { downloadCsv } from '../utils/csv';
import { buildSummaryCsv } from '../utils/exportSummary';
import {
  LARGE_EXPORT_ROWS,
  MAX_EXPORT_ROWS,
  countTelemetryRows,
  estimateTelemetryRows,
  telemetryCsvHeader,
  telemetryCsvRows,
} from '../utils/exportTelemetry';
import { fetchStoredTelemetry, hasStoredTelemetryRef } from '../utils/fetchStoredTelemetry';
import type { StoredTelemetryFailure } from '../utils/fetchStoredTelemetry';

interface AIBOMDownloadMenuProps {
  /** The AIBOMs to export: one on the detail page, the checked rows on the list. */
  items: AIBOMResource[];
}

/** Concurrent `AIBOMTelemetry` fetches; each object can be up to ~900 KB. */
const FETCH_BATCH = 6;

const stamp = (): string => new Date().toISOString().slice(0, 10);

const fileName = (kind: 'summary' | 'telemetry', items: AIBOMResource[]): string =>
  items.length === 1
    ? `aibom-${kind}-${items[0].metadata?.name ?? 'aibom'}.csv`
    : `aibom-${kind}-${String(items.length)}-aiboms-${stamp()}.csv`;

/**
 * "Download" menu with two items, each producing exactly one CSV however many
 * AIBOMs are selected: a wide summary (one row per AIBOM) and a long-format
 * telemetry file (one row per sample). Telemetry is fetched on demand and
 * only covers AIBOMs with stored series. Each payload's rows are built and the
 * payload dropped straight away, so memory holds one batch plus the CSV text,
 * not every payload; a large estimated file asks before anything is fetched
 * and an enormous one is refused.
 */
const AIBOMDownloadMenu: FC<AIBOMDownloadMenuProps> = ({ items }) => {
  const { t } = useTranslation('plugin__aibom-console-plugin');
  const [isOpen, setIsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  const [confirmRows, setConfirmRows] = useState<number | undefined>();

  // Leaving the page mid-export must not start a download or set state.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const eligible = items.filter(hasStoredTelemetryRef);

  const onSummary = () => {
    setMessage(undefined);
    downloadCsv(fileName('summary', items), buildSummaryCsv(items));
  };

  const skippedMessage = (
    included: number,
    failures: Record<Exclude<StoredTelemetryFailure, 'no-reference'>, number>,
  ): string | undefined => {
    const noReference = items.length - eligible.length;
    const reasons = [
      noReference > 0 && t('{{count}} have no stored telemetry.', { count: noReference }),
      failures.forbidden > 0 &&
        t('{{count}} could not be read (permission denied; the viewer role may need updating).', {
          count: failures.forbidden,
        }),
      failures['not-found'] > 0 &&
        t('{{count}} reference telemetry that no longer exists.', { count: failures['not-found'] }),
      failures.invalid > 0 &&
        t('{{count}} failed the integrity check or use an unsupported format.', {
          count: failures.invalid,
        }),
      failures.error > 0 && t('{{count}} failed to load.', { count: failures.error }),
    ].filter((reason): reason is string => Boolean(reason));
    if (included === items.length) return undefined;
    const head =
      included > 0
        ? t('Telemetry CSV includes {{included}} of {{total}} selected.', {
            included,
            total: items.length,
          })
        : t('Nothing was downloaded.');
    return [head, ...reasons].join(' ');
  };

  const runTelemetry = async () => {
    setMessage(undefined);
    setBusy(true);
    try {
      const chunks: string[] = [telemetryCsvHeader()];
      const included: AIBOMResource[] = [];
      const failures = { forbidden: 0, 'not-found': 0, invalid: 0, error: 0 };
      let rows = 0;

      for (let i = 0; i < eligible.length; i += FETCH_BATCH) {
        const batch = eligible.slice(i, i + FETCH_BATCH);
        const results = await Promise.all(batch.map(fetchStoredTelemetry));
        if (!alive.current) return;
        for (let index = 0; index < results.length; index++) {
          const result = results[index];
          if (!result.stored) {
            const failure = result.failure ?? 'error';
            if (failure !== 'no-reference') failures[failure]++;
            continue;
          }
          rows += countTelemetryRows(result.stored);
          chunks.push(telemetryCsvRows(batch[index], result.stored));
          included.push(batch[index]);
        }
        if (rows > MAX_EXPORT_ROWS) {
          setMessage(
            t(
              'The telemetry for this selection is too large to download at once (over {{max}} rows). Select fewer AIBOMs.',
              { max: MAX_EXPORT_ROWS.toLocaleString() },
            ),
          );
          return;
        }
      }

      if (included.length > 0) downloadCsv(fileName('telemetry', included), chunks);
      setMessage(skippedMessage(included.length, failures));
    } catch (error) {
      if (alive.current) {
        setMessage(
          t('Could not build the telemetry CSV: {{error}}', {
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      }
    } finally {
      if (alive.current) setBusy(false);
    }
  };

  const onTelemetry = () => {
    // Size known from the references alone, before fetching anything.
    const estimate = eligible.reduce(
      (sum, item) =>
        sum + estimateTelemetryRows(item.spec?.data?.telemetry_series_ref?.size_bytes ?? 0),
      0,
    );
    if (estimate > LARGE_EXPORT_ROWS) {
      setConfirmRows(estimate);
    } else {
      void runTelemetry();
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
            onClick={onTelemetry}
          >
            {t('Telemetry (CSV)')}
          </DropdownItem>
        </DropdownList>
      </Dropdown>
      {message && <Content component="small">{message}</Content>}
      {confirmRows !== undefined && (
        <Modal
          variant="small"
          isOpen
          onClose={() => {
            setConfirmRows(undefined);
          }}
        >
          <ModalHeader title={t('Large download')} />
          <ModalBody>
            {t(
              'This telemetry file will have about {{rows}} rows and may be slow to open in a spreadsheet. Download anyway?',
              { rows: confirmRows.toLocaleString() },
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              variant="primary"
              onClick={() => {
                setConfirmRows(undefined);
                void runTelemetry();
              }}
            >
              {t('Download')}
            </Button>
            <Button
              variant="link"
              onClick={() => {
                setConfirmRows(undefined);
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
