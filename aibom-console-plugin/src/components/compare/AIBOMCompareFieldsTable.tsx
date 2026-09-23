import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Flex, FlexItem, Label } from '@patternfly/react-core';
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import type { AIBOMResource } from '../../types/aibom';
import { buildFieldRows } from '../../utils/compareFields';
import { runColor } from '../../utils/runColors';

interface AIBOMCompareFieldsTableProps {
  items: AIBOMResource[];
  runNames: string[];
}

const AIBOMCompareFieldsTable: FC<AIBOMCompareFieldsTableProps> = ({ items, runNames }) => {
  const { t } = useTranslation('plugin__aibom-console-plugin');
  const rows = buildFieldRows(items);

  return (
    <Table aria-label={t('Field comparison')} variant="compact">
      <Thead>
        <Tr>
          <Th>{t('Field')}</Th>
          {runNames.map((name, index) => (
            <Th key={name}>
              <Label color={runColor(index)}>{name}</Label>
            </Th>
          ))}
        </Tr>
      </Thead>
      <Tbody>
        {rows.map((row) => (
          <Tr key={row.label}>
            <Td dataLabel={t('Field')}>
              {row.differs ? (
                <Flex
                  spaceItems={{ default: 'spaceItemsSm' }}
                  alignItems={{ default: 'alignItemsCenter' }}
                >
                  <FlexItem>
                    <strong>{row.label}</strong>
                  </FlexItem>
                  <FlexItem>
                    <Label color="orange" isCompact>
                      {t('differs')}
                    </Label>
                  </FlexItem>
                </Flex>
              ) : (
                row.label
              )}
            </Td>
            {row.values.map((value, index) => (
              <Td key={index} dataLabel={runNames[index]}>
                {value || '—'}
              </Td>
            ))}
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};

export default AIBOMCompareFieldsTable;
