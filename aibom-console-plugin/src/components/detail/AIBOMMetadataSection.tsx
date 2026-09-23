import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { DescriptionList, Title } from '@patternfly/react-core';
import type { AIBOMData } from '../../types/aibom';
import Field from './Field';

interface AIBOMMetadataSectionProps {
  metadata: AIBOMData['_metadata'];
}

const AIBOMMetadataSection: FC<AIBOMMetadataSectionProps> = ({ metadata }) => {
  const { t } = useTranslation('plugin__aibom-console-plugin');
  if (!metadata) return null;

  return (
    <>
      <Title headingLevel="h2">{t('AIBOM metadata')}</Title>
      <DescriptionList>
        <Field label={t('Version')}>{metadata.aibom_version}</Field>
        <Field label={t('Generated at')}>{metadata.generated_at}</Field>
        <Field label={t('Generator')}>{metadata.generator}</Field>
        <Field label={t('Schema compliance')}>{metadata.schema_compliance}</Field>
        <Field label={t('Dataset detection')}>{metadata.dataset_detection}</Field>
      </DescriptionList>
    </>
  );
};

export default AIBOMMetadataSection;
