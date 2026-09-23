import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { DescriptionList, Flex, FlexItem, Label } from '@patternfly/react-core';
import type { AIBOMData } from '../../types/aibom';
import Field from './Field';
import Section from './Section';

interface AIBOMDatasetSectionProps {
  dataset: AIBOMData['dataset'];
}

const AIBOMDatasetSection: FC<AIBOMDatasetSectionProps> = ({ dataset }) => {
  const { t } = useTranslation('plugin__aibom-console-plugin');
  if (!dataset) return null;
  const declared = dataset.declared;
  const autoDetected = dataset.auto_detected ?? [];

  return (
    <Section title={t('Dataset')} md={6}>
      <DescriptionList isHorizontal isCompact>
        <Field label={t('Declared')}>
          {declared?.name &&
            `${declared.name} ${declared.version ?? ''} (license: ${declared.license ?? '—'}, via: ${
              declared.declared_via ?? '—'
            })`}
        </Field>
        {autoDetected.map((d, index) => (
          <Field key={index} label={t('Auto-detected')}>
            <Flex
              spaceItems={{ default: 'spaceItemsSm' }}
              alignItems={{ default: 'alignItemsCenter' }}
            >
              <FlexItem>
                {d.dataset_name} {d.version ?? ''} (license: {d.license ?? '—'}, seen via:{' '}
                {(d.seen_via ?? []).join(', ')})
              </FlexItem>
              <FlexItem>
                <Label color={d.matches_declared ? 'green' : 'red'}>
                  {d.matches_declared ? t('matches declared') : t('DOES NOT MATCH DECLARED')}
                </Label>
              </FlexItem>
            </Flex>
          </Field>
        ))}
      </DescriptionList>
    </Section>
  );
};

export default AIBOMDatasetSection;
