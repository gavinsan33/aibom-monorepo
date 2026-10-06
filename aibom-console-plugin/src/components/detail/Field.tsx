import type { FC, ReactNode } from 'react';
import {
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
} from '@patternfly/react-core';

interface FieldProps {
  label: string;
  children: ReactNode;
}

/** One label/value row. Renders nothing when the value is missing, so callers don't need their own presence checks. */
const Field: FC<FieldProps> = ({ label, children }) => {
  if (children === undefined || children === null || children === '' || children === false)
    return null;
  return (
    <DescriptionListGroup>
      <DescriptionListTerm>{label}</DescriptionListTerm>
      <DescriptionListDescription>{children}</DescriptionListDescription>
    </DescriptionListGroup>
  );
};

export default Field;
