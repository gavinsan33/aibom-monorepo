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
`printDescribe` if extending this). The `Signature:` row is a real verification,
a port of `oc-aibom`'s `internal/aibom/verify.go` (`src/utils/verifySignature.ts`,
fetched by `detail/useSignatureVerification.ts`): Ed25519 (`@noble/curves`, not
WebCrypto -- Ed25519 support varies by browser) over `spec.data` canonicalized per
RFC 8785 (a ~10-line `canonicalize`, pinned by the same fixture as the webhook's
`test_sign_aibom_matches_go_jcs_reference_output`), then the embedded
`spec.signaturePublicKey` is cross-checked against the namespace's
`aibom-compiled-signing-public-key` ConfigMap, read with the viewer's own token.
Five states, same as the CLI: `valid` (the only one shown green/"Verified"),
`unsigned`, `invalid`, `key-mismatch`, `unconfirmed`. An unreadable anchor (no
grant, no ConfigMap) caps the result at `unconfirmed` -- never `valid`, because a
forger controlling `data` could embed their own key. The signature covers
`spec.data` only, not the sibling `spec.jobName`/`modelName`/`collectedAt`
fields the List view filters on. Not ported: `oc-aibom`'s `VerifySeries`
(chaining the telemetry series to the signature); the Telemetry tab still only
does the SHA-256/size integrity check described below. Only the Detail view
verifies; List/Compare/CSV do not.

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

**Telemetry tabs** (Detail: `src/components/detail/AIBOMTelemetryTab.tsx` +
`AIBOMStoredTelemetryCharts.tsx`; Compare: `src/components/compare/AIBOMCompareTelemetryTab.tsx`,
`TelemetryCompareChart.tsx`, `TelemetryLineChart.tsx`): charts drawn **only** from
the series stored with each AIBOM. There is deliberately **no live-Prometheus
fallback** -- it was removed (it needed a tenancy-proxy RBAC analysis, PromQL
builders mirroring the webhook's queries, could never chart GPUs, and only
reached back ~15 days). An AIBOM with no usable stored series shows an empty
state on the detail tab and is listed as "left out" on the Compare tab. Don't
re-add live queries or `QueryBrowser` without rethinking those tradeoffs; the
repository history has the old `promql.ts`, `prometheusRange.ts`, and the
RBAC/DCGM notes.

Charts use `@patternfly/react-charts` (Victory; bundled -- the console doesn't
share it -- ~313 KiB min, one lazy chunk). Compared runs happened at different
times, so every line is plotted against elapsed time since that run's own start,
in the run's `runChartColor` (matches its `Label` in the tables). Every chart in a
tab shares the same x range, `[0, longest window]` (`sharedElapsedMax`), rather than
auto-fitting its own data: metrics start reporting at different times (vLLM's only
once the server is up, TTFT only once a request completes), and auto-fitting stretched
those late series across the full width, so the same x position meant different times
in different charts. Each run is one
aggregate line by default; the "Show individual pods and GPUs" switch expands to
per-series lines (same color, dashed variants). Both tabs are gated by the same
feature flag (below).

Data: `spec.data.telemetry_series_ref` points at a separate `aibom.io/v1alpha1`
`AIBOMTelemetry` object (payload in `spec.seriesJson`) written by
`aibom-webhook-service` at collection time -- deliberately not inline in the AIBOM
(the list page's all-AIBOMs watch would carry it) and not a ConfigMap (it would
clutter namespaces). Schema: `src/types/telemetrySeries.ts`; source of truth is
that repo's `CLAUDE.md` "Telemetry Time Series". The object is found by the
reference's own `name` (it can't match the AIBOM's `generateName`d name), read via
`useK8sWatchResources` with the viewer's own token. `checkStoredTelemetry`
(`src/utils/storedTelemetry.ts`) requires the payload's UTF-8 byte length to equal
the reference's `size_bytes` and its SHA-256 to match before parsing; a mismatch is
never charted and shows a warning, and with no WebCrypto (non-secure context) the
series is unusable rather than trusted. That is integrity, not authenticity: the
reference lives in unvalidated `spec.data` and the telemetry path doesn't check the
AIBOM signature, so anyone who can create an AIBOM in a namespace can point it at
another run's `AIBOMTelemetry` in that same namespace (never another namespace --
it comes from the AIBOM's own metadata). Same trust model as the rest of
`spec.data`. The parser (`parseStoredTelemetry`) trusts nothing about the
payload's shape and never throws; a hook that awaits it must still always finish
loading.

GPU: stored series are the *only* GPU data. DCGM series are scraped by the GPU
operator, so their `namespace` label is `nvidia-gpu-operator` and a
namespace-scoped viewer query can't reach them; the webhook queries DCGM with its
own access and stores `gpu_utilization`, `gpu_memory_used`, `gpu_power` (per-GPU
under `series`). Don't grant viewers `cluster-monitoring-view` or GPU-operator
namespace access to work around a missing series.

Access: viewers read `AIBOMTelemetry` through the webhook chart's `aibom-view`
role, not through this plugin (the plugin's own ServiceAccount still has no API
access). A missing grant makes the watch fail, which the UI can only show as "no
usable stored telemetry" -- check RBAC first when charts are unexpectedly empty.
Local dev: the tabs now read ordinary Kubernetes objects, not the Thanos proxy, so
the old "always 403s under `yarn start-console`" limitation no longer applies
(untested) as long as the CRD and objects exist on the cluster you point at.

**CSV export** (`src/components/AIBOMDownloadMenu.tsx`, on the List view's
selection bar and the Detail view): a "Download" menu with exactly two items, each
producing ONE file however many AIBOMs are selected -- deliberately not a
checkbox + zip, and not one file per AIBOM (two files from one click trips
browsers' multiple-download prompt). **Summary** is wide, one row per AIBOM,
built from `compareFields.ts`/`comparePerformance.ts` so it can't drift from the
Compare view. **Telemetry** is long-format, one row per sample
(`aibom, job, model, gpu_type, gpu_count, experiment_intent, metric, unit, series,
timestamp_utc, unix_seconds, value`), in the webhook's raw base units, with the
identifying columns repeated per row so runs compare in one pivot without joining
(the summary shares the `aibom` `namespace/name` key). It covers only AIBOMs with
stored series, fetched on demand with `k8sGet` (never live Prometheus). Memory is
bounded on purpose: rows are built per AIBOM and each payload dropped right away;
the row count is estimated from each reference's `size_bytes` so the
`LARGE_EXPORT_ROWS` confirmation happens *before* anything is fetched; past
`MAX_EXPORT_ROWS` it refuses. It reports how many AIBOMs it skipped and why
(`fetchStoredTelemetry` returns a failure reason -- forbidden / not-found /
invalid / error -- so a missing viewer grant isn't reported as "no telemetry").
Export errors must always surface as a message, never a silent no-op.
`src/utils/csv.ts` does RFC 4180 escaping and prefixes a `'` to string cells that
start with `= + - @` (CSV injection: `spec.data` is unvalidated user text); keep
that when adding columns. List-page downloads cover everything counted in "N
selected", including rows a filter hides.

**Telemetry tab toggle**: the tab is enabled/disabled per deployment via
Helm value `plugin.featureFlags.telemetryTab`. The chart renders it into a
`feature-flags.json` key in the plugin's ConfigMap, mounted over the
baked-in default (repo-root `feature-flags.json`, copied to `dist/` at
build) at `/usr/share/nginx/html/feature-flags.json`;
`src/utils/pluginFeatureFlags.ts` fetches it at runtime through the
console's same-origin `/api/plugins/<name>/` proxy (the prefix webpack's
publicPath uses for chunks) and defaults to *enabled* when the file is
missing or unreadable. Don't gate it on cluster RBAC or watch a cluster
resource for it -- the plugin's SA has no API access by design.

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

Helm chart: `charts/aibom-console-plugin` (from the template, values
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
