import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { DescriptionList } from '@patternfly/react-core';
import type { AIBOMData } from '../../types/aibom';
import { formatFlexNumber, toFlexNumber } from '../../utils/flexible';
import Field from './Field';
import Section from './Section';

interface AIBOMModelSectionProps {
  model: AIBOMData['model'];
}

const AIBOMModelSection: FC<AIBOMModelSectionProps> = ({ model }) => {
  const { t } = useTranslation('plugin__aibom-console-plugin');
  if (!model) return null;
  const hasBits = toFlexNumber(model.quantization_bits) !== undefined;
  const spec = model.speculative_decoding;

  return (
    <Section title={t('Model')} md={6}>
      <DescriptionList isHorizontal isCompact columnModifier={{ default: '1Col', md: '2Col' }}>
        <Field label={t('Name')}>{model.name}</Field>
        <Field label={t('Version')}>{model.version}</Field>
        <Field label={t('Architecture')}>{model.architecture}</Field>
        <Field label={t('Framework')}>{model.framework}</Field>
        <Field label={t('Dtype')}>{model.dtype}</Field>
        <Field label={t('Quantization')}>
          {model.quantization &&
            (hasBits
              ? `${model.quantization} (${formatFlexNumber(model.quantization_bits)}-bit)`
              : model.quantization)}
        </Field>
        {spec?.enabled && (
          <Field label={t('Speculative decoding')}>
            {`${spec.draft_model ?? t('unknown')} (tokens: ${formatFlexNumber(spec.num_speculative_tokens)})`}
          </Field>
        )}
      </DescriptionList>
    </Section>
  );
};

export default AIBOMModelSection;
