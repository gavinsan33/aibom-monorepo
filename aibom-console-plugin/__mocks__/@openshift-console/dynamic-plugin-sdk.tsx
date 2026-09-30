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

/** One-shot fetch; resolves undefined by default (tests supply the `AIBOMTelemetry` object with `mockResolvedValue`). */
export const k8sGet = jest.fn().mockResolvedValue(undefined) as unknown as typeof SDK.k8sGet;

/** Every watched resource loads as "not found" (`data: null`) by default; tests override with `mockImplementation` to supply series objects. */
export const useK8sWatchResources = jest.fn((resources: Record<string, unknown>) =>
  Object.fromEntries(
    Object.keys(resources).map((key) => [key, { data: null, loaded: true, loadError: undefined }]),
  ),
) as unknown as typeof SDK.useK8sWatchResources;
