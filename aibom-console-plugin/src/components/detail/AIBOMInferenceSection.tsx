import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { DescriptionList, Divider, Stack, StackItem } from '@patternfly/react-core';
import type { AIBOMData } from '../../types/aibom';
import { INFERENCE_METRIC_LABELS, INFERENCE_METRIC_ORDER } from '../../types/aibom';
import { formatFlexNumber } from '../../utils/flexible';
import AIBOMMetricsTable from './AIBOMMetricsTable';
import Field from './Field';
import Section from './Section';

interface AIBOMInferenceSectionProps {
  inference: AIBOMData['inference'];
}

const AIBOMInferenceSection: FC<AIBOMInferenceSectionProps> = ({ inference }) => {
  const { t } = useTranslation('plugin__aibom-console-plugin');
  if (!inference) return null;
  const performanceMetrics = inference.performance?.metrics;
  const hasPerformance = performanceMetrics && Object.keys(performanceMetrics).length > 0;

  return (
    <Section title={t('Inference')}>
      <Stack hasGutter>
        <StackItem>
          <DescriptionList isHorizontal isCompact columnModifier={{ default: '1Col', md: '2Col' }}>
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
        </StackItem>
        {hasPerformance && (
          <>
            <StackItem>
              <Divider />
            </StackItem>
            <StackItem>
              <AIBOMMetricsTable
                title={t('Inference Performance')}
                metrics={performanceMetrics}
                order={INFERENCE_METRIC_ORDER}
                labels={INFERENCE_METRIC_LABELS}
                summaryIncludesColdStart={inference.performance?.summary_includes_cold_start}
              />
            </StackItem>
          </>
        )}
      </Stack>
    </Section>
  );
};

export default AIBOMInferenceSection;
