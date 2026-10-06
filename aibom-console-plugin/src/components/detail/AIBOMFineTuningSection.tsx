import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { DescriptionList } from '@patternfly/react-core';
import type { AIBOMData } from '../../types/aibom';
import { formatFlexNumber } from '../../utils/flexible';
import Field from './Field';
import Section from './Section';

interface AIBOMFineTuningSectionProps {
  fineTuning: AIBOMData['fine_tuning'];
}

const AIBOMFineTuningSection: FC<AIBOMFineTuningSectionProps> = ({ fineTuning }) => {
  const { t } = useTranslation('plugin__aibom-console-plugin');
  if (!fineTuning) return null;

  return (
    <Section title={t('Fine-tuning')} md={6}>
      <DescriptionList isHorizontal isCompact>
        <Field label={t('Adaptation method')}>{fineTuning.adaptation_method}</Field>
        <Field label={t('LoRA rank / alpha')}>
          {`${formatFlexNumber(fineTuning.lora_rank)} / ${formatFlexNumber(fineTuning.lora_alpha)}`}
        </Field>
      </DescriptionList>
    </Section>
  );
};

export default AIBOMFineTuningSection;
