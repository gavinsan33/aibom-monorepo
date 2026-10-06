import type { FC } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Bullseye, EmptyState, EmptyStateBody, Spinner } from '@patternfly/react-core';
import type { AIBOMResource } from '../../types/aibom';
import { getJobName } from '../../utils/aibomFields';
import { hasStoredTelemetryRef } from '../../utils/fetchStoredTelemetry';
import { toFlexNumber } from '../../utils/flexible';
import { useStoredTelemetry } from '../compare/useStoredTelemetry';
import AIBOMStoredTelemetryCharts from './AIBOMStoredTelemetryCharts';

interface AIBOMTelemetryTabProps {
  item: AIBOMResource;
}

/**
 * Charts the series stored with the AIBOM (`spec.data.telemetry_series_ref`).
 * There is deliberately no live-Prometheus fallback: an AIBOM with no usable
 * stored series (created before the webhook stored them, or metrics were
 * unavailable when it was collected) shows an empty state, and one whose
 * stored copy fails its digest/size check shows a warning and no charts.
 */
const AIBOMTelemetryTab: FC<AIBOMTelemetryTabProps> = ({ item }) => {
  const { t } = useTranslation('plugin__aibom-console-plugin');
  const items = useMemo(() => [item], [item]);
  const { loading, byItem, mismatched } = useStoredTelemetry(items);

  // No reference means nothing to wait for.
  if (hasStoredTelemetryRef(item) && loading) {
    return (
      <Bullseye>
        <Spinner size="xl" aria-label={t('Loading telemetry')} />
      </Bullseye>
    );
  }

  const jobName = getJobName(item); // '' when unset, hence not `??`
  const name = jobName === '' ? (item.metadata?.name ?? '') : jobName;
  const stored = byItem[0];

  if (stored) {
    return (
      <AIBOMStoredTelemetryCharts
        stored={stored}
        name={name}
        expectsGpu={(toFlexNumber(item.spec?.data?.environment?.gpu_count) ?? 0) > 0}
      />
    );
  }

  if (mismatched.length > 0) {
    return (
      <Alert
        variant="warning"
        isInline
        title={t(
          "Stored telemetry doesn't match the AIBOM's recorded digest for: {{runs}}. It was not charted.",
          { runs: name },
        )}
      />
    );
  }

  return (
    <EmptyState titleText={t('No stored telemetry for this run')} headingLevel="h4">
      <EmptyStateBody>
        {t(
          "Telemetry charts come from series stored with the AIBOM when it was collected. This AIBOM has none usable: it was created before telemetry was stored, metrics weren't available at collection time, or the stored copy can't be read here (an unsupported format, or a non-HTTPS connection).",
        )}
      </EmptyStateBody>
    </EmptyState>
  );
};

export default AIBOMTelemetryTab;
