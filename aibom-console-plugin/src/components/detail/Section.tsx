import type { FC, ReactNode } from 'react';
import { Card, CardBody, CardTitle, GridItem } from '@patternfly/react-core';
import type { gridSpans } from '@patternfly/react-core';

interface SectionProps {
  title: string;
  children: ReactNode;
  /** Grid columns (of 12) on small screens and up; defaults to full width. */
  span?: gridSpans;
  /** Grid columns (of 12) on medium screens and up; defaults to `span`. */
  md?: gridSpans;
}

/** A titled card in the Detail page's grid, the common wrapper every section renders itself in for consistent spacing/boundaries and horizontal layout. */
const Section: FC<SectionProps> = ({ title, children, span = 12, md }) => (
  <GridItem span={span} md={md ?? span}>
    <Card>
      <CardTitle>{title}</CardTitle>
      <CardBody>{children}</CardBody>
    </Card>
  </GridItem>
);

export default Section;
