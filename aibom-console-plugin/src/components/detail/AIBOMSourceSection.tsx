import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { DescriptionList, Label, Title } from '@patternfly/react-core';
import type { AIBOMData } from '../../types/aibom';
import Field from './Field';

interface AIBOMSourceSectionProps {
  sourceCode: AIBOMData['source_code'];
}

const AIBOMSourceSection: FC<AIBOMSourceSectionProps> = ({ sourceCode }) => {
  const { t } = useTranslation('plugin__aibom-console-plugin');
  if (!sourceCode) return null;

  return (
    <>
      <Title headingLevel="h2">{t('Source')}</Title>
      <DescriptionList>
        <Field label={t('Repository')}>{sourceCode.git_repository}</Field>
        <Field label={t('Commit')}>
          {sourceCode.git_commit && (
            <>
              {sourceCode.git_commit} (branch: {sourceCode.git_branch ?? '—'}, dirty:{' '}
              {sourceCode.dirty ? <Label color="yellow">{t('true')}</Label> : t('false')}, via:{' '}
              {sourceCode.declared_via ?? '—'})
            </>
          )}
        </Field>
      </DescriptionList>
    </>
  );
};

export default AIBOMSourceSection;
