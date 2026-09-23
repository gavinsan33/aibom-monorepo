import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Content, Label, List, ListItem, Title } from '@patternfly/react-core';
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import type { MetricSegments, MetricStats } from '../../types/aibom';
import { toFlexNumber } from '../../utils/flexible';
import { sparkline } from '../../utils/metricSegments';

interface AIBOMMetricsTableProps {
  title: string;
  metrics: Record<string, MetricStats> | undefined;
  order: readonly string[];
  labels: Record<string, string>;
  summaryIncludesColdStart?: boolean;
  grafanaLinks?: string[];
  note?: string;
}

const formatSegment = (value: MetricSegments[keyof MetricSegments]): string => {
  const num = toFlexNumber(value);
  return num === undefined ? '—' : num.toFixed(2);
};

const maxCellColor = (
  max: number | undefined,
  limit: number | undefined,
): 'red' | 'yellow' | undefined => {
  if (max === undefined || limit === undefined || limit === 0) return undefined;
  const ratio = max / limit;
  if (ratio >= 1) return 'red';
  if (ratio >= 0.9) return 'yellow';
  return undefined;
};

const AIBOMMetricsTable: FC<AIBOMMetricsTableProps> = ({
  title,
  metrics,
  order,
  labels,
  summaryIncludesColdStart,
  grafanaLinks,
  note,
}) => {
  const { t } = useTranslation('plugin__aibom-console-plugin');

  if (note) {
    return (
      <>
        <Title headingLevel="h3">{title}</Title>
        <Content component="p">{note}</Content>
      </>
    );
  }

  const rows = order.filter((key) => metrics?.[key] !== undefined);
  if (rows.length === 0) return null;

  return (
    <>
      <Title headingLevel="h3">{title}</Title>
      <Table aria-label={title} variant="compact">
        <Thead>
          <Tr>
            <Th>{t('Metric')}</Th>
            <Th>{t('Min')}</Th>
            <Th>{t('Avg')}</Th>
            <Th>{t('Max')}</Th>
            <Th>{t('Limit')}</Th>
            <Th>{t('P95')}</Th>
            <Th>{t('Unit')}</Th>
            <Th>{t('1st -> mid -> last')}</Th>
            <Th>{t('Shape')}</Th>
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((key) => {
            const stats = metrics?.[key];
            const max = toFlexNumber(stats?.max);
            const limit = toFlexNumber(stats?.limit);
            const color = maxCellColor(max, limit);
            return (
              <Tr key={key}>
                <Td dataLabel={t('Metric')}>{labels[key] ?? key}</Td>
                <Td dataLabel={t('Min')}>{toFlexNumber(stats?.min)?.toFixed(2) ?? '—'}</Td>
                <Td dataLabel={t('Avg')}>{toFlexNumber(stats?.avg)?.toFixed(2) ?? '—'}</Td>
                <Td dataLabel={t('Max')}>
                  {color ? (
                    <Label color={color}>{max?.toFixed(2)}</Label>
                  ) : (
                    (max?.toFixed(2) ?? '—')
                  )}
                </Td>
                <Td dataLabel={t('Limit')}>{limit?.toFixed(2) ?? '—'}</Td>
                <Td dataLabel={t('P95')}>{toFlexNumber(stats?.p95)?.toFixed(2) ?? '—'}</Td>
                <Td dataLabel={t('Unit')}>{stats?.unit ?? ''}</Td>
                <Td dataLabel={t('1st -> mid -> last')}>
                  {`${formatSegment(stats?.segments?.first_third)} -> ${formatSegment(
                    stats?.segments?.middle_third,
                  )} -> ${formatSegment(stats?.segments?.last_third)}`}
                </Td>
                <Td dataLabel={t('Shape')}>{sparkline(stats?.segments) || '—'}</Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
      {summaryIncludesColdStart && (
        <Content component="small">{t('(includes cold start)')}</Content>
      )}
      {grafanaLinks && grafanaLinks.length > 0 && (
        <List isPlain>
          {grafanaLinks.map((link) => (
            <ListItem key={link}>
              <a href={link} target="_blank" rel="noreferrer">
                {t('Grafana')}
              </a>
            </ListItem>
          ))}
        </List>
      )}
    </>
  );
};

export default AIBOMMetricsTable;
