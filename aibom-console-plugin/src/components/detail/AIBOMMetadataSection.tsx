import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { DescriptionList } from '@patternfly/react-core';
import type { AIBOMData } from '../../types/aibom';
import Field from './Field';
import Section from './Section';

interface AIBOMMetadataSectionProps {
  metadata: AIBOMData['_metadata'];
}

const AIBOMMetadataSection: FC<AIBOMMetadataSectionProps> = ({ metadata }) => {
  const { t } = useTranslation('plugin__aibom-console-plugin');
  if (!metadata) return null;

  return (
    <Section title={t('AIBOM metadata')} md={6}>
      <DescriptionList isHorizontal isCompact columnModifier={{ default: '1Col', md: '2Col' }}>
        <Field label={t('Version')}>{metadata.aibom_version}</Field>
        <Field label={t('Generated at')}>{metadata.generated_at}</Field>
        <Field label={t('Generator')}>{metadata.generator}</Field>
        <Field label={t('Schema compliance')}>{metadata.schema_compliance}</Field>
        <Field label={t('Dataset detection')}>{metadata.dataset_detection}</Field>
      </DescriptionList>
    </Section>
  );
};

export default AIBOMMetadataSection;
