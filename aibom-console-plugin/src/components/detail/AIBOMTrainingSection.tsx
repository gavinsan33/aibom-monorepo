import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { DescriptionList, Title } from '@patternfly/react-core';
import type { AIBOMData } from '../../types/aibom';
import { INFERENCE_METRIC_LABELS, INFERENCE_METRIC_ORDER } from '../../types/aibom';
import { formatFlexNumber } from '../../utils/flexible';
import AIBOMMetricsTable from './AIBOMMetricsTable';
import Field from './Field';

interface AIBOMTrainingSectionProps {
  training: AIBOMData['training'];
  fineTuning: AIBOMData['fine_tuning'];
  inference: AIBOMData['inference'];
}

const AIBOMTrainingSection: FC<AIBOMTrainingSectionProps> = ({
  training,
  fineTuning,
  inference,
}) => {
  const { t } = useTranslation('plugin__aibom-console-plugin');
  if (!training && !fineTuning && !inference) return null;

  return (
    <>
      {training && (
        <>
          <Title headingLevel="h2">{t('Training')}</Title>
          <DescriptionList>
            <Field label={t('Optimizer')}>{training.optimizer}</Field>
            <Field label={t('Learning rate')}>{formatFlexNumber(training.learning_rate)}</Field>
            <Field label={t('Batch size')}>{formatFlexNumber(training.batch_size)}</Field>
            <Field label={t('Epochs')}>{formatFlexNumber(training.epochs)}</Field>
            <Field label={t('Random seed')}>{formatFlexNumber(training.random_seed)}</Field>
            <Field label={t('Parallelization')}>{training.parallelization_strategy}</Field>
          </DescriptionList>
        </>
      )}
      {fineTuning && (
        <>
          <Title headingLevel="h2">{t('Fine-tuning')}</Title>
          <DescriptionList>
            <Field label={t('Adaptation method')}>{fineTuning.adaptation_method}</Field>
            <Field label={t('LoRA rank / alpha')}>
              {`${formatFlexNumber(fineTuning.lora_rank)} / ${formatFlexNumber(fineTuning.lora_alpha)}`}
            </Field>
          </DescriptionList>
        </>
      )}
      {inference && (
        <>
          <Title headingLevel="h2">{t('Inference')}</Title>
          <DescriptionList>
            <Field label={t('Serving engine')}>{inference.serving_engine}</Field>
            <Field label={t('Max model len')}>{formatFlexNumber(inference.max_model_len)}</Field>
            <Field label={t('Tensor / pipeline / data parallel')}>
              {`${formatFlexNumber(inference.tensor_parallel_size)} / ${formatFlexNumber(
                inference.pipeline_parallel_size,
              )} / ${formatFlexNumber(inference.data_parallel_size)}`}
            </Field>
            <Field label={t('Expert parallel')}>
              {inference.enable_expert_parallel === undefined
                ? undefined
                : String(inference.enable_expert_parallel)}
            </Field>
            <Field label={t('GPU memory utilization')}>
              {formatFlexNumber(inference.gpu_memory_utilization)}
            </Field>
            <Field label={t('Temperature / top-p / top-k')}>
              {`${formatFlexNumber(inference.temperature)} / ${formatFlexNumber(inference.top_p)} / ${formatFlexNumber(
                inference.top_k,
              )}`}
            </Field>
            <Field label={t('Max tokens')}>{formatFlexNumber(inference.max_tokens)}</Field>
          </DescriptionList>
          {inference.performance?.metrics &&
            Object.keys(inference.performance.metrics).length > 0 && (
              <AIBOMMetricsTable
                title={t('Inference Performance')}
                metrics={inference.performance.metrics}
                order={INFERENCE_METRIC_ORDER}
                labels={INFERENCE_METRIC_LABELS}
                summaryIncludesColdStart={inference.performance.summary_includes_cold_start}
              />
            )}
        </>
      )}
    </>
  );
};

export default AIBOMTrainingSection;
