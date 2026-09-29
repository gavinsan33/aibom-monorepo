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
  showLegend?: boolean;
}

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
  showLegend,
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
        showLegend={showLegend}
        hideControls
        onZoom={() => {
          setZoomed(true);
        }}
      />
    </>
  );
};

export default TelemetryChart;
