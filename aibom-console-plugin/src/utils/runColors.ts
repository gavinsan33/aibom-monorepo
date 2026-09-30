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

/** PatternFly chart color token family for each `RUN_COLORS` entry, so SVG strokes match the run's `Label` color (and follow dark mode). */
const RUN_CHART_TOKENS = ['blue', 'purple', 'yellow', 'green', 'red-orange', 'teal'];

/** CSS `var(...)` for the run's chart stroke color, matching `runColor(index)`. */
export const runChartColor = (index: number): string =>
  `var(--pf-t--chart--color--${RUN_CHART_TOKENS[index % RUN_CHART_TOKENS.length]}--300)`;

export const runColor = (index: number): NonNullable<LabelProps['color']> =>
  RUN_COLORS[index % RUN_COLORS.length];
