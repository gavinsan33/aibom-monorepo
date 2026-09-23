import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { DescriptionList, Label } from '@patternfly/react-core';
import type { AIBOMResource } from '../../types/aibom';
import { earliestPodStart, formatDuration } from '../../utils/executionMetadata';
import { podStatusColor } from '../../utils/podStatus';
import Field from './Field';

interface AIBOMHeaderSectionProps {
  item: AIBOMResource;
}

const AIBOMHeaderSection: FC<AIBOMHeaderSectionProps> = ({ item }) => {
  const { t } = useTranslation('plugin__aibom-console-plugin');
  const spec = item.spec ?? {};
  const data = spec.data ?? {};
  const status = data.execution_metadata?.status;
  const start = earliestPodStart(data.execution_metadata?.pods);
  const duration = formatDuration(data.execution_metadata?.duration_seconds);

  return (
    <DescriptionList>
      <Field label={t('Name')}>{item.metadata?.name}</Field>
      <Field label={t('Namespace')}>{item.metadata?.namespace}</Field>
      <Field label={t('Job')}>{spec.jobName}</Field>
      {data.experiment_name && data.experiment_name !== spec.jobName && (
        <Field label={t('Experiment')}>{data.experiment_name}</Field>
      )}
      <Field label={t('Description')}>{data.experiment_description}</Field>
      <Field label={t('Experiment intent')}>
        {spec.experimentIntent}
        {data.experiment_intent_declared_via && ` (via: ${data.experiment_intent_declared_via})`}
      </Field>
      <Field label={t('Runtime')}>
        {duration && start && `${duration} (${start} -> ${spec.collectedAt ?? '?'})`}
      </Field>
      <Field label={t('Status')}>
        {status && <Label color={podStatusColor(status)}>{status}</Label>}
      </Field>
      <Field label={t('Signature')}>
        {spec.signature ? t('signed — not verified in this view') : t('not signed')}
      </Field>
    </DescriptionList>
  );
};

export default AIBOMHeaderSection;
