import { useState } from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DescriptionList,
  ExpandableSection,
  Grid,
  GridItem,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import type { AIBOMData } from '../../types/aibom';
import { toFlexNumber } from '../../utils/flexible';
import Field from './Field';

type Environment = NonNullable<AIBOMData['environment']>;

interface AIBOMHardwareDetailsProps {
  environment: Environment;
}

/** Discovery values are shell output; multi-line ones (lsblk) read better comma-separated. */
const formatValue = (value: unknown): string =>
  (typeof value === 'string' ? value : JSON.stringify(value))
    .trim()
    .split(/\s*\n\s*/)
    .join(', ');

/** "2 × 80 GiB" when every GPU matches, else each size in turn. */
const formatGpuMemory = (mb: (number | string)[]): string | undefined => {
  const gib = mb
    .map((m) => toFlexNumber(m))
    .map((m) => (m === undefined ? '?' : `${String(Math.round(m / 1024))} GiB`));
  if (gib.length === 0) return undefined;
  return gib.every((g) => g === gib[0]) ? `${String(gib.length)} × ${gib[0]}` : gib.join(', ');
};

const hasEntries = (rec?: Record<string, unknown>): rec is Record<string, unknown> =>
  !!rec && Object.keys(rec).length > 0;

/** Collapsed-by-default breakdown of the extra discovery data: one titled block per group. */
const AIBOMHardwareDetails: FC<AIBOMHardwareDetailsProps> = ({ environment }) => {
  const { t } = useTranslation('plugin__aibom-console-plugin');
  const [expanded, setExpanded] = useState(false);

  const groups: { title: string; data?: Record<string, unknown>; fields: [string, string][] }[] = [
    {
      title: t('GPU'),
      data: environment.gpu_memory_mb && { gpu_memory: formatGpuMemory(environment.gpu_memory_mb) },
      fields: [['gpu_memory', t('GPU memory')]],
    },
    {
      title: t('CPU'),
      data: environment.cpu,
      fields: [
        ['cpu_architecture', t('Architecture')],
        ['cpu_cores_per_socket', t('Cores per socket')],
        ['cpu_threads_per_core', t('Threads per core')],
        ['cache_l3', t('L3 cache')],
      ],
    },
    {
      title: t('Network'),
      data: environment.network,
      fields: [
        ['primary_mtu', t('Primary MTU')],
        ['rdma_devices', t('RDMA devices')],
      ],
    },
    {
      title: t('Storage'),
      data: environment.storage,
      fields: [['block_devices', t('Block devices')]],
    },
    {
      title: t('Kernel config'),
      data: environment.kernel_config,
      fields: [
        ['cpu_governor', t('CPU governor')],
        ['numa_balancing', t('NUMA balancing')],
        ['transparent_hugepages', t('Transparent hugepages')],
        ['max_map_count', t('Max map count')],
      ],
    },
  ];

  const visibleGroups = groups.filter((g) => hasEntries(g.data));
  if (visibleGroups.length === 0) return null;

  return (
    <ExpandableSection
      toggleText={expanded ? t('Hide hardware details') : t('Show hardware details')}
      isExpanded={expanded}
      onToggle={(_event, isExpanded) => {
        setExpanded(isExpanded);
      }}
    >
      <Stack hasGutter>
        {visibleGroups.length > 0 && (
          <StackItem>
            <Grid hasGutter>
              {visibleGroups.map((g) => (
                <GridItem key={g.title} md={6}>
                  <Title headingLevel="h4" size="md">
                    {g.title}
                  </Title>
                  <DescriptionList
                    isHorizontal
                    isCompact
                    horizontalTermWidthModifier={{ default: '22ch' }}
                  >
                    {g.fields.map(([key, label]) => (
                      <Field key={key} label={label}>
                        {g.data?.[key] === undefined ? undefined : formatValue(g.data[key])}
                      </Field>
                    ))}
                  </DescriptionList>
                </GridItem>
              ))}
            </Grid>
          </StackItem>
        )}
      </Stack>
    </ExpandableSection>
  );
};

export default AIBOMHardwareDetails;
