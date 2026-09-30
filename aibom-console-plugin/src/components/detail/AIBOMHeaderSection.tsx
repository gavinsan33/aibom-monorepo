import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { DescriptionList, Label, Spinner } from '@patternfly/react-core';
import type { AIBOMResource } from '../../types/aibom';
import { earliestPodStart, formatDuration } from '../../utils/executionMetadata';
import { podStatusColor } from '../../utils/podStatus';
import { verifyLabelColor } from './verifyLabel';
import Field from './Field';
import Section from './Section';
import { useSignatureVerification } from './useSignatureVerification';

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
  const verification = useSignatureVerification(item);
  const verifyText = {
    valid: t('Verified'),
    unsigned: t('Not signed'),
    invalid: t('Invalid signature'),
    'key-mismatch': t('Signing key does not match cluster'),
    unconfirmed: t('Signature valid, key not confirmed'),
  };

  return (
    <Section title={t('Overview')}>
      <DescriptionList
        isHorizontal
        isCompact
        columnModifier={{ default: '1Col', md: '2Col', lg: '3Col' }}
      >
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
          {verification ? (
            <>
              <Label color={verifyLabelColor(verification.status)}>
                {verifyText[verification.status]}
              </Label>{' '}
              {/* Detail strings come from the (English-only) verifier, like oc-aibom's. */}
              {verification.status !== 'unsigned' && verification.detail}
            </>
          ) : (
            <Spinner size="md" aria-label={t('Verifying signature')} />
          )}
        </Field>
      </DescriptionList>
    </Section>
  );
};

export default AIBOMHeaderSection;
