import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { DescriptionList } from '@patternfly/react-core';
import type { AIBOMData } from '../../types/aibom';
import { formatFlexNumber } from '../../utils/flexible';
import Field from './Field';
import Section from './Section';

interface AIBOMTrainingSectionProps {
  training: AIBOMData['training'];
}

const AIBOMTrainingSection: FC<AIBOMTrainingSectionProps> = ({ training }) => {
  const { t } = useTranslation('plugin__aibom-console-plugin');
  if (!training) return null;

  return (
    <Section title={t('Training')} md={6}>
      <DescriptionList isHorizontal isCompact columnModifier={{ default: '1Col', md: '2Col' }}>
        <Field label={t('Optimizer')}>{training.optimizer}</Field>
        <Field label={t('Learning rate')}>{formatFlexNumber(training.learning_rate)}</Field>
        <Field label={t('Batch size')}>{formatFlexNumber(training.batch_size)}</Field>
        <Field label={t('Epochs')}>{formatFlexNumber(training.epochs)}</Field>
        <Field label={t('Random seed')}>{formatFlexNumber(training.random_seed)}</Field>
        <Field label={t('Parallelization')}>{training.parallelization_strategy}</Field>
      </DescriptionList>
    </Section>
  );
};

export default AIBOMTrainingSection;
