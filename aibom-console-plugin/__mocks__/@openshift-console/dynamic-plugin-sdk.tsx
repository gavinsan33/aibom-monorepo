/*
 * A majority of the OpenShift Console's dynamic plugin SDK components and API
 * implementations are only available at runtime as they are provided using
 * module federation.
 *
 * As a result, no implementations of these components and APIs are available
 * when running tests in your plugin.
 *
 * To workaround this, you may add minimal stub implementations of components
 * and APIs you use in your plugin here to allow your tests to run.
 */
import type * as SDK from '@openshift-console/dynamic-plugin-sdk';

export const ListPageHeader: typeof SDK.ListPageHeader = ({ title }) => <h1>{title}</h1>;

export const DocumentTitle: typeof SDK.DocumentTitle = () => null;

/** Renders its query/namespace props as visible text so tests can assert the right PromQL/scoping reached the component, without needing the real chart-rendering implementation. */
export const QueryBrowser: typeof SDK.QueryBrowser = ({ queries, namespace }) => (
  <div data-test="query-browser" data-namespace={namespace}>
    {queries.map((query) => (
      <div key={query}>{query}</div>
    ))}
  </div>
);
