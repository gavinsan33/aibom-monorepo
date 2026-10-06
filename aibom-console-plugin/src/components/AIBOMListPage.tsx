import type { FC } from 'react';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';
import {
  DocumentTitle,
  isAllNamespacesKey,
  ListPageHeader,
  NamespaceBar,
  useActiveNamespace,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  Alert,
  Bullseye,
  Button,
  EmptyState,
  Flex,
  FlexItem,
  PageSection,
  Spinner,
} from '@patternfly/react-core';
import type { AIBOMResource, SortKey } from '../types/aibom';
import { SORTABLE_METRICS } from '../types/aibom';
import type { AIBOMFilter } from '../utils/filter';
import { applyFilter } from '../utils/filter';
import {
  parseListState,
  parseSelected,
  serializeListState,
  serializeSelected,
} from '../utils/listUrlState';
import { sortItems } from '../utils/sort';
import { aibomKey } from '../utils/exportSummary';
import AIBOMDownloadMenu from './AIBOMDownloadMenu';
import AIBOMFilterToolbar from './AIBOMFilterToolbar';
import AIBOMListTable from './AIBOMListTable';

const AIBOM_GVK = { group: 'aibom.io', version: 'v1alpha1', kind: 'AIBOM' };

const AIBOMListPage: FC = () => {
  const { t } = useTranslation('plugin__aibom-console-plugin');
  const navigate = useNavigate();
  const [activeNamespace] = useActiveNamespace();
  // Filter/sort live in the URL (not component state) so they survive
  // navigating to a detail page and back.
  const [searchParams, setSearchParams] = useSearchParams();
  const { filter, sortKey, ascending } = useMemo(
    () => parseListState(searchParams, Object.keys(SORTABLE_METRICS).concat('age')),
    [searchParams],
  );
  const updateListState = useCallback(
    (next: Partial<{ filter: AIBOMFilter; sortKey: SortKey; ascending: boolean }>) => {
      setSearchParams((prev) => serializeListState({ filter, sortKey, ascending, ...next }, prev), {
        replace: true,
      });
    },
    [filter, sortKey, ascending, setSearchParams],
  );
  const setFilter = (next: AIBOMFilter) => {
    updateListState({ filter: next });
  };
  const setSort = (key: SortKey, asc: boolean) => {
    updateListState({ sortKey: key, ascending: asc });
  };
  // Checked rows also live in the URL, so they survive the Compare page and
  // detail pages (browser back) just like filter/sort.
  const selected = useMemo(() => parseSelected(searchParams), [searchParams]);
  const setSelected = (next: Set<string>) => {
    setSearchParams((prev) => serializeSelected(next, prev), { replace: true });
  };

  const onToggleSelect = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setSelected(next);
  };

  const onCompare = () => {
    void navigate(`/aiboms/compare?items=${encodeURIComponent(Array.from(selected).join(','))}`);
  };

  const [items, loaded, loadError] = useK8sWatchResource<AIBOMResource[]>({
    groupVersionKind: AIBOM_GVK,
    isList: true,
    namespace: isAllNamespacesKey(activeNamespace) ? undefined : activeNamespace,
  }) as [AIBOMResource[], boolean, unknown];

  const visibleItems = useMemo(() => {
    if (!loaded || loadError) return [];
    const filtered = applyFilter(items, filter);
    return sortItems(filtered, sortKey, ascending);
  }, [items, loaded, loadError, filter, sortKey, ascending]);

  // Everything checked, including rows a filter currently hides -- what
  // "N selected" promises. Rows outside the watched namespace scope can't be
  // resolved and are left out of downloads.
  const selectedItems = useMemo(
    () => items.filter((item) => selected.has(aibomKey(item))),
    [items, selected],
  );

  return (
    <>
      <DocumentTitle>{t('AIBOMs')}</DocumentTitle>
      <NamespaceBar />
      <ListPageHeader title={t('AIBOMs')} />
      <PageSection>
        {loadError ? (
          <Alert variant="danger" title={t('Error loading AIBOMs')}>
            {loadError instanceof Error ? loadError.message : t('Unknown error')}
          </Alert>
        ) : !loaded ? (
          <Bullseye>
            <Spinner size="xl" aria-label={t('Loading AIBOMs')} />
          </Bullseye>
        ) : (
          <>
            <AIBOMFilterToolbar
              items={items}
              filter={filter}
              onFilterChange={setFilter}
              sortKey={sortKey}
              onSortChange={setSort}
            />
            {selected.size > 0 && (
              <Flex
                alignItems={{ default: 'alignItemsCenter' }}
                spaceItems={{ default: 'spaceItemsSm' }}
              >
                <FlexItem>{t('{{count}} selected', { count: selected.size })}</FlexItem>
                <FlexItem>
                  <Button variant="primary" isDisabled={selected.size < 2} onClick={onCompare}>
                    {t('Compare')}
                  </Button>
                </FlexItem>
                <FlexItem>
                  <AIBOMDownloadMenu items={selectedItems} />
                </FlexItem>
                <FlexItem>
                  <Button
                    variant="link"
                    onClick={() => {
                      setSelected(new Set());
                    }}
                  >
                    {t('Clear selection')}
                  </Button>
                </FlexItem>
              </Flex>
            )}
            {visibleItems.length === 0 ? (
              <Bullseye>
                <EmptyState titleText={t('No AIBOMs found')} headingLevel="h4" />
              </Bullseye>
            ) : (
              <AIBOMListTable
                items={visibleItems}
                sortKey={sortKey}
                ascending={ascending}
                onSort={setSort}
                selected={selected}
                onToggleSelect={onToggleSelect}
              />
            )}
          </>
        )}
      </PageSection>
    </>
  );
};

export default AIBOMListPage;
