import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@patternfly/react-core';
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import type { AIBOMResource } from '../../types/aibom';
import { buildPerformanceRows } from '../../utils/comparePerformance';
import type { PerformanceCell } from '../../utils/comparePerformance';
import { runColor } from '../../utils/runColors';

interface AIBOMComparePerformanceTableProps {
  items: AIBOMResource[];
  runNames: string[];
}

const signColor = (value: number): 'green' | 'red' | undefined => {
  if (value > 0) return 'green';
  if (value < 0) return 'red';
  return undefined;
};

const formatCell = (cell: PerformanceCell): string =>
  cell.unavailable
    ? '—'
    : `${cell.avg.toFixed(2)} ${cell.unit}${cell.sparkline ? ` ${cell.sparkline}` : ''}`.trim();

const AIBOMComparePerformanceTable: FC<AIBOMComparePerformanceTableProps> = ({
  items,
  runNames,
}) => {
  const { t } = useTranslation('plugin__aibom-console-plugin');
  const rows = buildPerformanceRows(items);
  const showDelta = items.length === 2;

  return (
    <Table aria-label={t('Performance comparison')} variant="compact">
      <Thead>
        <Tr>
          <Th>{t('Metric')}</Th>
          {runNames.map((name, index) => (
            <Th key={name}>
              <Label color={runColor(index)}>{name}</Label>
            </Th>
          ))}
          {showDelta && (
            <>
              <Th>{t('Delta')}</Th>
              <Th>{t('Change')}</Th>
            </>
          )}
        </Tr>
      </Thead>
      <Tbody>
        {rows.map((row) => (
          <Tr key={row.metricKey}>
            <Td dataLabel={t('Metric')}>{row.label}</Td>
            {row.values.map((cell, index) => (
              <Td key={index} dataLabel={runNames[index]}>
                {formatCell(cell)}
              </Td>
            ))}
            {showDelta && (
              <>
                <Td dataLabel={t('Delta')}>
                  {row.delta === undefined ? (
                    '—'
                  ) : (
                    <Label color={signColor(row.delta)} isCompact>
                      {row.delta > 0 ? `+${row.delta.toFixed(2)}` : row.delta.toFixed(2)}
                    </Label>
                  )}
                </Td>
                <Td dataLabel={t('Change')}>
                  {row.pctChange === undefined ? (
                    t('N/A')
                  ) : (
                    <Label color={signColor(row.pctChange)} isCompact>
                      {row.pctChange > 0
                        ? `+${row.pctChange.toFixed(1)}%`
                        : `${row.pctChange.toFixed(1)}%`}
                    </Label>
                  )}
                </Td>
              </>
            )}
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};

export default AIBOMComparePerformanceTable;
