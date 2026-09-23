import type { FC } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
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
import type { AIBOMFilter } from '../utils/filter';
import { applyFilter } from '../utils/filter';
import { sortItems } from '../utils/sort';
import AIBOMFilterToolbar from './AIBOMFilterToolbar';
import AIBOMListTable from './AIBOMListTable';

const AIBOM_GVK = { group: 'aibom.io', version: 'v1alpha1', kind: 'AIBOM' };

const AIBOMListPage: FC = () => {
  const { t } = useTranslation('plugin__aibom-console-plugin');
  const navigate = useNavigate();
  const [activeNamespace] = useActiveNamespace();
  const [filter, setFilter] = useState<AIBOMFilter>({});
  const [sortKey, setSortKey] = useState<SortKey>('age');
  const [ascending, setAscending] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const onToggleSelect = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
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
              ascending={ascending}
              onSortChange={(key, asc) => {
                setSortKey(key);
                setAscending(asc);
              }}
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
                onSort={(key, asc) => {
                  setSortKey(key);
                  setAscending(asc);
                }}
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
