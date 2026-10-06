/** Mirrors `oc-aibom`'s `formatPodStatus`/`statusCell` coloring rule. */
export type StatusColor = 'red' | 'green' | 'yellow' | undefined;

export function podStatusColor(status: string | undefined): StatusColor {
  if (!status) return undefined;
  if (status === 'OOMKilled') return 'red';
  if (status === 'Completed') return 'green';
  return 'yellow';
}
