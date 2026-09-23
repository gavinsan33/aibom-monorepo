import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { SortByDirection, Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import type { AIBOMResource, SortKey } from '../types/aibom';
import {
  getCollectedAt,
  getExperimentIntent,
  getGpuType,
  getJobName,
  getMetricAvg,
  getMetricUnit,
  getModelName,
  getQuantization,
} from '../utils/aibomFields';
import { SORTABLE_METRICS } from '../types/aibom';

interface AIBOMListTableProps {
  items: AIBOMResource[];
  sortKey: SortKey;
  ascending: boolean;
  onSort: (sortKey: SortKey, ascending: boolean) => void;
}

const AIBOMListTable: FC<AIBOMListTableProps> = ({ items, sortKey, ascending, onSort }) => {
  const { t } = useTranslation('plugin__aibom-console-plugin');
  const metricKey = sortKey === 'age' ? undefined : SORTABLE_METRICS[sortKey];

  const onSortClick = (clicked: SortKey) => {
    onSort(clicked, clicked === sortKey ? !ascending : false);
  };

  const sortDirection: SortByDirection = ascending ? SortByDirection.asc : SortByDirection.desc;

  const sortParams = (key: SortKey, index: number) => ({
    sort: {
      sortBy: {
        index: sortKey === key ? index : -1,
        direction: sortDirection,
      },
      onSort: () => {
        onSortClick(key);
      },
      columnIndex: index,
    },
  });

  return (
    <Table aria-label={t('AIBOMs')} variant="compact">
      <Thead>
        <Tr>
          <Th>{t('Job')}</Th>
          <Th>{t('Model')}</Th>
          <Th>{t('Experiment intent')}</Th>
          <Th>{t('Quantization')}</Th>
          <Th>{t('GPU type')}</Th>
          <Th {...sortParams('age', 5)}>{t('Collected at')}</Th>
          {metricKey && <Th {...sortParams(sortKey, 6)}>{sortKey}</Th>}
        </Tr>
      </Thead>
      <Tbody>
        {items.map((item) => (
          <Tr key={`${item.metadata?.namespace ?? ''}/${item.metadata?.name ?? ''}`}>
            <Td dataLabel={t('Job')}>{getJobName(item) || '—'}</Td>
            <Td dataLabel={t('Model')}>{getModelName(item) || '—'}</Td>
            <Td dataLabel={t('Experiment intent')}>{getExperimentIntent(item) || '—'}</Td>
            <Td dataLabel={t('Quantization')}>{getQuantization(item) || '—'}</Td>
            <Td dataLabel={t('GPU type')}>{getGpuType(item) || '—'}</Td>
            <Td dataLabel={t('Collected at')}>{getCollectedAt(item) || '—'}</Td>
            {metricKey && (
              <Td dataLabel={sortKey}>
                {getMetricAvg(item, metricKey).toFixed(2)} {getMetricUnit(item, metricKey)}
              </Td>
            )}
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};

export default AIBOMListTable;
