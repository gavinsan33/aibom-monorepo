import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { DescriptionList } from '@patternfly/react-core';
import type { AIBOMData } from '../../types/aibom';
import { formatFlexNumber, toFlexNumber } from '../../utils/flexible';
import Field from './Field';
import Section from './Section';

interface AIBOMEnvironmentSectionProps {
  environment: AIBOMData['environment'];
}

const AIBOMEnvironmentSection: FC<AIBOMEnvironmentSectionProps> = ({ environment }) => {
  const { t } = useTranslation('plugin__aibom-console-plugin');
  if (!environment) return null;
  const memoryGb = toFlexNumber(environment.memory_gb);

  return (
    <Section title={t('Environment')} md={6}>
      <DescriptionList isHorizontal isCompact columnModifier={{ default: '1Col', md: '2Col' }}>
        <Field label={t('GPU')}>
          {environment.gpu_type &&
            `${environment.gpu_type} x${formatFlexNumber(environment.gpu_count)}`}
        </Field>
        <Field label={t('CPU')}>
          {environment.cpu_model &&
            `${environment.cpu_model} (${formatFlexNumber(environment.cpu_cores)} cores)`}
        </Field>
        <Field label={t('Memory')}>
          {memoryGb !== undefined &&
            `${memoryGb.toFixed(2)} GB (${formatFlexNumber(environment.numa_nodes)} NUMA node(s))`}
        </Field>
        <Field label={t('CUDA version')}>{environment.cuda_version}</Field>
        <Field label={t('Driver version')}>{environment.driver_version}</Field>
        <Field label={t('Framework version')}>{environment.framework_version}</Field>
        <Field label={t('Kernel version')}>{environment.kernel_version}</Field>
      </DescriptionList>
    </Section>
  );
};

export default AIBOMEnvironmentSection;
