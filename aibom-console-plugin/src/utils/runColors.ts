import type { LabelProps } from '@patternfly/react-core';

/** Cycles through distinct colors per compared run, mirroring `oc-aibom`'s `runColor` (blue/magenta/yellow/green/red/cyan), using PatternFly's supported `Label` color names. */
const RUN_COLORS: NonNullable<LabelProps['color']>[] = [
  'blue',
  'purple',
  'yellow',
  'green',
  'red',
  'teal',
];

export const runColor = (index: number): NonNullable<LabelProps['color']> =>
  RUN_COLORS[index % RUN_COLORS.length];
