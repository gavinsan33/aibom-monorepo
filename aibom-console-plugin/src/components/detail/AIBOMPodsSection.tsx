import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Label, Title } from '@patternfly/react-core';
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import type { AIBOMPod } from '../../types/aibom';
import { podStatusColor } from '../../utils/podStatus';

interface AIBOMPodsSectionProps {
  pods: AIBOMPod[] | undefined;
}

const AIBOMPodsSection: FC<AIBOMPodsSectionProps> = ({ pods }) => {
  const { t } = useTranslation('plugin__aibom-console-plugin');
  if (!pods || pods.length === 0) return null;

  return (
    <>
      <Title headingLevel="h2">{t('Pods')}</Title>
      <Table aria-label={t('Pods')} variant="compact">
        <Thead>
          <Tr>
            <Th>{t('Name')}</Th>
            <Th>{t('Node')}</Th>
            <Th>{t('IP')}</Th>
            <Th>{t('Start')}</Th>
            <Th>{t('Status')}</Th>
          </Tr>
        </Thead>
        <Tbody>
          {pods.map((pod) => (
            <Tr key={pod.pod_uid ?? pod.pod_name}>
              <Td dataLabel={t('Name')}>{pod.pod_name ?? '—'}</Td>
              <Td dataLabel={t('Node')}>{pod.node_name ?? '—'}</Td>
              <Td dataLabel={t('IP')}>{pod.pod_ip ?? '—'}</Td>
              <Td dataLabel={t('Start')}>{pod.start_time ?? '—'}</Td>
              <Td dataLabel={t('Status')}>
                {pod.status ? <Label color={podStatusColor(pod.status)}>{pod.status}</Label> : '—'}
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </>
  );
};

export default AIBOMPodsSection;
