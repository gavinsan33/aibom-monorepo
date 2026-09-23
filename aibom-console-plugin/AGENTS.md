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

## Scope (v1)

Only a **List view** exists so far: filter/sort AIBOMs, mirroring
[`oc-aibom list`](https://github.com/gavinsan33/oc-aibom)'s field mapping and
sort/filter semantics exactly. Detail view, Compare view, segmented
performance charts, and live Prometheus telemetry are deliberately out of
scope until later work (see
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
- Namespace scope comes from the console's own `useActiveNamespace`/
  `NamespaceBar` (the `#ALL_NS#` sentinel, `ALL_NAMESPACES_KEY`, means "all
  projects") — don't reimplement an explicit all-namespaces toggle.

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
