import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Content, Switch } from '@patternfly/react-core';

interface FitToDataSwitchProps {
  id: string;
  isChecked: boolean;
  onChange: (checked: boolean) => void;
}

/**
 * Off by default: charts share one x range so the same position means the same
 * elapsed time everywhere. On zooms each chart to where its own data is (e.g.
 * TTFT, which only starts once a request completes), so say plainly that the
 * charts no longer line up.
 */
const FitToDataSwitch: FC<FitToDataSwitchProps> = ({ id, isChecked, onChange }) => {
  const { t } = useTranslation('plugin__aibom-console-plugin');
  return (
    <>
      <Switch
        id={id}
        label={t('Fit each chart to its data')}
        isChecked={isChecked}
        onChange={(_event, checked) => {
          onChange(checked);
        }}
      />
      {isChecked && (
        <Content component="small">
          {t('Charts are zoomed to their own data and no longer share a time axis.')}
        </Content>
      )}
    </>
  );
};

export default FitToDataSwitch;
