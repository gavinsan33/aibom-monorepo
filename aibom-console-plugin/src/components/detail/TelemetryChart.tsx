import type { FC } from 'react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QueryBrowser } from '@openshift-console/dynamic-plugin-sdk';
import { Button } from '@patternfly/react-core';

interface TelemetryChartProps {
  query: string;
  namespace: string;
  /** Fixed window: [endTime - timespan, endTime], in ms. */
  endTime: number;
  timespan: number;
  units?: string;
  /** Prefix series titles with the pod name (JobSets / multi-pod runs). */
  multiPod?: boolean;
}

/**
 * Short series title instead of QueryBrowser's default of every label, which
 * for cAdvisor series includes the cgroup path in `id`
 * (`/kubepods.slice/kubepods-burstable.slice/...`).
 */
const seriesTitle =
  (multiPod: boolean) =>
  (labels: Record<string, string>): string => {
    const parts = [multiPod ? labels.pod : undefined, labels.container, labels.interface].filter(
      Boolean,
    );
    return parts.length > 0 ? parts.join(' / ') : labels.pod || 'value';
  };

/**
 * `QueryBrowser` pinned to a fixed window, with the relative-to-now
 * timespan/poll controls hidden. Drag-to-zoom still works; "Reset zoom"
 * remounts the chart, which restores the original window exactly as on page
 * load (QueryBrowser's own reset would fall back to its relative timespan).
 */
const TelemetryChart: FC<TelemetryChartProps> = ({
  query,
  namespace,
  endTime,
  timespan,
  units,
  multiPod = false,
}) => {
  const { t } = useTranslation('plugin__aibom-console-plugin');
  const [zoomed, setZoomed] = useState(false);
  const [resetCount, setResetCount] = useState(0);

  const reset = useCallback(() => {
    setZoomed(false);
    setResetCount((n) => n + 1);
  }, []);

  return (
    <>
      {zoomed && (
        <Button variant="link" isInline onClick={reset}>
          {t('Reset zoom')}
        </Button>
      )}
      <QueryBrowser
        key={resetCount}
        queries={[query]}
        namespace={namespace}
        fixedEndTime={endTime}
        timespan={timespan}
        units={units}
        showLegend
        formatSeriesTitle={seriesTitle(multiPod)}
        hideControls
        onZoom={() => {
          setZoomed(true);
        }}
      />
    </>
  );
};

export default TelemetryChart;
