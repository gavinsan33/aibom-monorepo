import type { FC } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Checkbox,
  Content,
  FormSelect,
  FormSelectOption,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import type { AIBOMFilter } from '../utils/filter';
import type { AIBOMResource, SortKey } from '../types/aibom';
import { HARDWARE_METRIC_LABELS, SORTABLE_METRICS } from '../types/aibom';
import {
  getAdaptationMethod,
  getArchitecture,
  getExperimentIntent,
  getFramework,
  getGitBranch,
  getGitRepository,
  getGpuType,
  getJobName,
  getModelName,
  getOptimizer,
  getQuantization,
  getServingEngine,
} from '../utils/aibomFields';

type FilterField = keyof Omit<AIBOMFilter, 'driftOnly'>;

const FIELD_CONFIG: {
  field: FilterField;
  label: string;
  getValue: (a: AIBOMResource) => string;
}[] = [
  { field: 'model', label: 'Model', getValue: getModelName },
  { field: 'intent', label: 'Experiment intent', getValue: getExperimentIntent },
  { field: 'quantization', label: 'Quantization', getValue: getQuantization },
  { field: 'architecture', label: 'Architecture', getValue: getArchitecture },
  { field: 'framework', label: 'Framework', getValue: getFramework },
  { field: 'gpuType', label: 'GPU type', getValue: getGpuType },
  { field: 'jobName', label: 'Job', getValue: getJobName },
  { field: 'gitBranch', label: 'Git branch', getValue: getGitBranch },
  { field: 'gitRepository', label: 'Git repository', getValue: getGitRepository },
  { field: 'servingEngine', label: 'Serving engine', getValue: getServingEngine },
  { field: 'adaptationMethod', label: 'Adaptation method', getValue: getAdaptationMethod },
  { field: 'optimizer', label: 'Optimizer', getValue: getOptimizer },
];

interface AIBOMFilterToolbarProps {
  items: AIBOMResource[];
  filter: AIBOMFilter;
  onFilterChange: (filter: AIBOMFilter) => void;
  sortKey: SortKey;
  ascending: boolean;
  onSortChange: (sortKey: SortKey, ascending: boolean) => void;
}

const ALL_VALUE = '';

const AIBOMFilterToolbar: FC<AIBOMFilterToolbarProps> = ({
  items,
  filter,
  onFilterChange,
  sortKey,
  ascending,
  onSortChange,
}) => {
  const { t } = useTranslation('plugin__aibom-console-plugin');

  const optionsByField = useMemo(() => {
    const result = {} as Record<FilterField, string[]>;
    for (const { field, getValue } of FIELD_CONFIG) {
      const values = new Set<string>();
      items.forEach((item) => {
        const value = getValue(item);
        if (value) values.add(value);
      });
      result[field] = Array.from(values).sort((a, b) => a.localeCompare(b));
    }
    return result;
  }, [items]);

  return (
    <Toolbar
      clearAllFilters={() => {
        onFilterChange({});
      }}
    >
      <ToolbarContent>
        <ToolbarGroup variant="filter-group">
          {FIELD_CONFIG.map(({ field, label }) => (
            <ToolbarItem key={field}>
              <FormSelect
                aria-label={t(label)}
                value={filter[field] ?? ALL_VALUE}
                onChange={(_event, value) => {
                  onFilterChange({ ...filter, [field]: value || undefined });
                }}
              >
                <FormSelectOption
                  value={ALL_VALUE}
                  label={t('All {{label}}', { label: t(label) })}
                />
                {optionsByField[field].map((value) => (
                  <FormSelectOption key={value} value={value} label={value} />
                ))}
              </FormSelect>
            </ToolbarItem>
          ))}
          <ToolbarItem>
            <Checkbox
              id="aibom-drift-only"
              label={t('Drift only')}
              isChecked={!!filter.driftOnly}
              onChange={(_event, checked) => {
                onFilterChange({ ...filter, driftOnly: checked });
              }}
            />
          </ToolbarItem>
        </ToolbarGroup>
        <ToolbarGroup align={{ default: 'alignEnd' }}>
          <ToolbarItem>
            <Content component="small">{t('Sort by')}</Content>
          </ToolbarItem>
          <ToolbarItem>
            <FormSelect
              aria-label={t('Sort by')}
              value={sortKey}
              onChange={(_event, value) => {
                onSortChange(value as SortKey, ascending);
              }}
            >
              <FormSelectOption value="age" label={t('Collected at')} />
              {Object.entries(SORTABLE_METRICS).map(([sortKeyOption, metricKey]) => (
                <FormSelectOption
                  key={sortKeyOption}
                  value={sortKeyOption}
                  label={HARDWARE_METRIC_LABELS[metricKey] ?? sortKeyOption}
                />
              ))}
            </FormSelect>
          </ToolbarItem>
          <ToolbarItem>
            <Checkbox
              id="aibom-sort-ascending"
              label={t('Ascending')}
              isChecked={ascending}
              onChange={(_event, checked) => {
                onSortChange(sortKey, checked);
              }}
            />
          </ToolbarItem>
        </ToolbarGroup>
      </ToolbarContent>
    </Toolbar>
  );
};

export default AIBOMFilterToolbar;
