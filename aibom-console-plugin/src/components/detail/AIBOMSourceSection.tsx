import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { DescriptionList, Label } from '@patternfly/react-core';
import type { AIBOMData } from '../../types/aibom';
import Field from './Field';
import Section from './Section';

interface AIBOMSourceSectionProps {
  sourceCode: AIBOMData['source_code'];
}

const AIBOMSourceSection: FC<AIBOMSourceSectionProps> = ({ sourceCode }) => {
  const { t } = useTranslation('plugin__aibom-console-plugin');
  if (!sourceCode) return null;

  return (
    <Section title={t('Source')} md={6}>
      <DescriptionList isHorizontal isCompact>
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
    </Section>
  );
};

export default AIBOMSourceSection;
