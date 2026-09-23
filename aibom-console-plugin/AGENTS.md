# AI Agent Instructions for aibom-console-plugin

This is an OpenShift Console dynamic plugin for browsing/filtering
`aibom.io/v1alpha1` `AIBOM` custom resources (produced by the sibling project
`aibom-webhook-service`). It was scaffolded from
[`openshift/console-plugin-template`](https://github.com/openshift/console-plugin-template);
most of the build/deploy/i18n/lint machinery below is inherited from that
template unchanged — see its own docs for the underlying mechanics.

**Key Technologies:** TypeScript + React 18, PatternFly 6, Rspack (module
federation), react-i18next, Playwright, Helm.

**Compatibility:** OpenShift 4.12+ (`ConsolePlugin` CRD v1).

## Scope

**List view** (`src/components/AIBOMListPage.tsx`): filter/sort AIBOMs,
mirroring [`oc-aibom list`](https://github.com/gavinsan33/oc-aibom)'s field
mapping and sort/filter semantics exactly.

**Detail view** (`src/components/AIBOMDetailPage.tsx` + `src/components/detail/`):
a single AIBOM's full field breakdown, mirroring `oc-aibom describe`'s
section order and field mapping (see that project's `cmd/kubectl-aibom/main.go`
`printDescribe` if extending this). Deliberately does **not** port
`describe`'s Ed25519 + RFC 8785 (JCS) signature verification — the
`Signature:` row only reports presence (`signed — not verified in this view`
/ `not signed`). Porting real verification (WebCrypto/Ed25519 + a JCS
canonicalization lib + a cluster ConfigMap lookup) is a deliberate future
step, not an oversight — don't half-implement it.

**Compare view** (`src/components/AIBOMComparePage.tsx` + `src/components/compare/`):
select 2+ AIBOMs on the List view (checkbox column + action bar), compared
at `/aiboms/compare?items=<urlencoded ns/name pairs>`. Deliberately unifies
`oc-aibom`'s two separate `diff` (exactly 2, full field list, only differing
fields, delta/%-change) and `compare` (2+, fixed 4-field summary, averages
only, no delta) commands into one N-scalable view: `src/utils/compareFields.ts`
always shows the fuller `diff` field list for all N items (flagging
divergent rows rather than hiding agreement), `src/utils/comparePerformance.ts`
shows a sparkline per item always and Delta/%-change only at exactly 2. If
you're tempted to add a `Trend()`-word-based badge (`"up"`/`"down"`/`"flat"`/
`"volatile"`) — don't; it's defined in `oc-aibom`'s Go types but never
actually rendered by any CLI command, so there's no reference format to
mirror and you'd be inventing presentation, not porting it.

**Telemetry tab** (`src/components/detail/AIBOMTelemetryTab.tsx`, added to
`AIBOMDetailPage.tsx` via `Tabs`/`Tab`): live, full-resolution time-series
charts, one per metric, via the console SDK's `QueryBrowser` component --
**not** a custom chart renderer or a new charting library dependency.
`src/utils/promql.ts` builds the PromQL, mirroring
`aibom-webhook-service/postprocess/postprocess.py`'s `TELEMETRY_QUERIES`/
`VLLM_TELEMETRY_QUERIES` verbatim (label names, `rate()`/`avg_over_time()`
windows, the `exported_pod` vs. `pod` label distinction for GPU vs.
everything else) so live charts read the same series the AIBOM's own
recorded stats came from. If those queries ever change upstream, update
`promql.ts` and its tests to match -- a drifted label silently produces an
empty/wrong chart with no error. Time window is `earliestPodStart(pods)` to
`spec.collectedAt`, cold start included (unlike the summary stats' trimmed
window) since showing that shape is the tab's whole point. Multi-pod
(JobSet) support is a `pod=~"a|b|c"` regex alternation across all pod names,
not a query per pod. Hardware charts gate on `environment.gpu_count > 0`;
inference charts gate on `inference.serving_engine === 'vllm'` -- matches
the existing tables' own gating logic, so don't add hardware charts for a
non-GPU workload just because pods exist.

**RBAC (verified, not guessed)**: `QueryBrowser` is always given a
`namespace` prop, which makes console's own `getPrometheusURL` route
through the *tenancy-scoped* Prometheus proxy (`/api/prometheus-tenancy` ->
`thanos-querier.openshift-monitoring.svc:9092`) instead of the cluster-wide
admin one (`/api/prometheus` -> `:9091`, needs `cluster-monitoring-view`).
The tenancy port's `kube-rbac-proxy` sidecar (per
`cluster-monitoring-operator`'s own `thanos-querier.libsonnet`) authorizes
by checking `get` on `pods.metrics.k8s.io` in the query's `namespace` param
-- confirmed present in the standard `view` ClusterRole via `oc get
clusterrole view -o yaml` and a live `oc auth can-i get pods.metrics.k8s.io
-n <ns>` check. **Don't add a `cluster-monitoring-view` RBAC requirement or
grant anywhere in this repo or `aibom-webhook-service`'s charts for viewer
access** -- it's already covered by `aibom-view`'s `view` aggregation. If
you ever drop the `namespace` prop from a `QueryBrowser` call, you silently
switch back to the admin-only endpoint and reintroduce this requirement.

**Local dev-loop limitation**: `yarn start-console`'s off-cluster bridge
mode (`--k8s-mode-off-cluster-thanos`, what `start-console.sh` sets) points
*both* the admin and tenancy proxy configs at the same single public Thanos
URL -- there is no way to reach the real tenancy-enforcing `:9092` service
from outside the cluster (it's ClusterIP-only by design). So the Telemetry
tab will *always* 403/404 in local dev regardless of this design being
correct, and will require `cluster-monitoring-view` locally no matter what.
Don't "fix" this by loosening the real RBAC design to work around a
local-only limitation -- verify the Telemetry tab only via an actual
in-cluster deployment (Helm chart, registered on the real `Console` CR).

Segmented-chart visualizations beyond what the existing metrics tables and
the Telemetry tab already cover are deliberately out of scope until later
work (see
[aibom-webhook-service#94](https://github.com/gavinsan33/aibom-webhook-service/issues/94)).
Don't add them speculatively.

## Data model

`spec.data` on the AIBOM CR is `x-kubernetes-preserve-unknown-fields` — no
CRD-enforced schema, and some numeric fields arrive as numeric-looking
strings instead of JSON numbers (best-effort CLI-arg parsing upstream). Read
`spec`/`spec.data` only through the accessors in `src/utils/aibomFields.ts`
and `src/utils/flexible.ts`'s `toFlexNumber`, not by assuming a strict
`AIBOMData` shape — `src/types/aibom.ts` types it loosely on purpose.

`src/utils/filter.ts` and `src/utils/sort.ts` are a direct TypeScript port of
`oc-aibom`'s `internal/aibom/{filter,sort}.go`. If either side's filter set,
sort keys, or edge-case behavior (missing metric defaults to 0 not excluded;
unparseable/missing `collectedAt` always sorts last) changes, update both
and re-check `*.spec.ts` against the Go `*_test.go` files.

## Architecture & Patterns

### Dynamic Plugin System

- `console-extensions.json`: declares the `/aiboms` route + nav item.
- `package.json`'s `consolePlugin.exposedModules`: maps `AIBOMListPage` to
  `src/components/AIBOMListPage.tsx`. Any new page component needs an entry
  here **and** a matching `$codeRef` in `console-extensions.json`.
- `rspack.config.ts`: module federation + build config (inherited from the
  template; don't hand-roll webpack config here).

### Component Structure

- Functional components with hooks only (no classes), all `.tsx`.
- `AIBOMListPage.tsx` owns data fetching (`useK8sWatchResource` against GVK
  `{group: 'aibom.io', version: 'v1alpha1', kind: 'AIBOM'}`) and filter/sort
  state; `AIBOMFilterToolbar.tsx` and `AIBOMListTable.tsx` are presentational.
  Table rows link to `/aiboms/:namespace/:name` via `react-router`'s `Link`.
- `AIBOMDetailPage.tsx` fetches a single AIBOM (`useParams` for
  namespace/name) and delegates to one section component per `describe`
  section under `src/components/detail/` — each takes only the narrow slice
  of `AIBOMData` it renders, not the whole resource. `detail/Field.tsx` is a
  shared label/value row that renders nothing when its value is
  missing/empty/false, so section components don't need their own presence
  checks. `detail/AIBOMMetricsTable.tsx` is shared between Hardware
  Performance and Inference Performance (same table shape, different
  metric key order/labels) — don't fork it into two components.
- Namespace scope comes from the console's own `useActiveNamespace`/
  `NamespaceBar` (the `#ALL_NS#` sentinel, `ALL_NAMESPACES_KEY`, means "all
  projects") — don't reimplement an explicit all-namespaces toggle. The
  Detail view instead takes namespace from its own route param, since it's
  reached by a direct link, not the namespace switcher.

### Styling Constraints

`.stylelintrc.yaml` enforces (inherited from the template, don't relax
without understanding why): no hex colors (use PatternFly tokens — dark mode
compatibility), no naked element selectors, no `.pf-`/`.co-` prefixed
classes, custom classes prefixed with `aibom-console-plugin__`.

## Internationalization (i18n)

Namespace: `plugin__aibom-console-plugin`. Run `yarn i18n` after
adding/changing translatable strings to update `locales/en/`.

## Testing

- `yarn test` — Jest. `src/utils/*.spec.ts` are the load-bearing tests here
  (filter/sort/flexible-number correctness against the Go reference
  implementation); keep those passing above all else.
- `@openshift-console/dynamic-plugin-sdk` only exists as module-federation
  remote code at runtime, so tests stub the pieces they need in
  `__mocks__/@openshift-console/dynamic-plugin-sdk.tsx` (Jest auto-mocks this
  scoped package from that path). Add a stub there for any new SDK
  hook/component a test needs to render through.
- `yarn test-e2e[-headless]` — Playwright, requires a real cluster
  (`start-console.sh`); not part of routine local iteration.

## Build & Deployment

Helm chart: `charts/openshift-console-plugin` (from the template, values
defaulted to this plugin's name/description). Its `patch-consoles` Job
auto-registers the plugin on the cluster's `Console` CR — no manual RBAC
edit needed by default. The plugin's own ServiceAccount has **no** RBAC
beyond serving static files: real API calls run through the console's proxy
using the logged-in user's own token, never a plugin-owned identity. Don't
add ClusterRole/RoleBinding grants to the plugin's SA — if a future view
needs API access the plugin itself must make server-side, that's a
deliberate architecture change, flag it rather than bolting it on.

## References

- [Console Plugin SDK](https://github.com/openshift/console/tree/master/frontend/packages/console-dynamic-plugin-sdk)
- [`oc-aibom`](https://github.com/gavinsan33/oc-aibom) — the CLI this plugin's List view mirrors
- [`aibom-webhook-service`](https://github.com/gavinsan33/aibom-webhook-service) — produces the AIBOM CRs this plugin reads; see its `CLAUDE.md` for the full data model
