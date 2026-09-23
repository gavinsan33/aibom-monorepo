# aibom-console-plugin

An OpenShift Console dynamic plugin for browsing and filtering `aibom.io/v1alpha1`
`AIBOM` custom resources, produced by
[`aibom-webhook-service`](https://github.com/gavinsan33/aibom-webhook-service).
It runs inside the OpenShift web console itself, so it inherits the logged-in
user's OAuth token and existing RBAC on `aiboms.aibom.io` — no separate
login or auth system.

For a terminal-based alternative with the same filter/sort/compare
capabilities, see [`oc-aibom`](https://github.com/gavinsan33/oc-aibom), the
`kubectl`/`oc` plugin this project's List view mirrors.

Scaffolded from
[`openshift/console-plugin-template`](https://github.com/openshift/console-plugin-template).
See that project's own README for the underlying dynamic-plugin mechanics
(module federation, `ConsolePlugin` CR, i18n, linting rules) not repeated
here.

## Status

**List, Detail, and Compare views.** Filter/sort AIBOMs across a namespace or
all projects (mirroring `oc-aibom list`), and click into a single AIBOM for
its full field breakdown — model, dataset drift, source provenance,
training/fine-tuning/inference config, environment, per-pod status, and
segmented hardware/inference performance tables (mirroring `oc-aibom
describe`). The Detail view's `Signature:` row reports presence only
(`signed — not verified in this view` / `not signed`) — it does not perform
`oc-aibom`'s Ed25519 + RFC 8785 verification.

Select 2+ AIBOMs from the List view (checkbox column) and click **Compare**
to see them side by side: every field `oc-aibom diff` tracks (model,
dataset, source, environment, metadata) shown for all selected items with
divergent rows flagged, and a hardware-performance table with a value +
trend sparkline per item, plus Delta/% Change columns when comparing exactly
2. Unifies `oc-aibom`'s two separate `diff`/`compare` commands into one
N-scalable view rather than replicating both CLI shapes.

The Detail view's **Telemetry** tab shows live, full-resolution time-series
charts — not just the CR's stored min/max/avg/p95 — via the console SDK's
`QueryBrowser`, querying the cluster's Prometheus directly with the exact
same PromQL `aibom-webhook-service`'s `postprocess.py` uses, scoped to the
AIBOM's own pod(s) and run window. Hardware charts (GPU/CPU/memory/network/
storage) show when the workload requested a GPU; inference charts (TTFT,
ITL, queue depth, KV-cache, throughput) show for vLLM workloads. Requires
the viewing user to have their own cluster-monitoring view access (see
Prerequisites) — this is separate from the postprocess Job's own monitoring
RBAC, which only covers that Job's identity, not arbitrary console users.

## Prerequisites

- `aibom-webhook-service`'s CRD (`aiboms.aibom.io`) and its `aibom-view`
  aggregated `ClusterRole` installed on the cluster. A user with `view` on a
  namespace can already browse AIBOMs there through this plugin with no
  extra RBAC grant — this repo does not create or duplicate that role.
- For the Detail view's **Telemetry** tab: the viewing user needs their own
  `cluster-monitoring-view` (or equivalent) access to the cluster's
  Prometheus. Charts query through the console's own Prometheus proxy as
  the logged-in user — the `cluster-monitoring-view` RoleBinding
  `aibom-webhook-service`'s charts already grant is bound to the
  postprocess Job's ServiceAccount, not to your users, so it doesn't cover
  this.
- Node.js and [yarn](https://yarnpkg.com) to build the plugin.
- `oc`/`kubectl` and an OpenShift cluster (4.12+, `ConsolePlugin` CRD v1) to
  run or deploy it.

## Development

```sh
yarn install
yarn start            # dev server on :9001
```

In a second terminal:

```sh
oc login
yarn start-console    # runs OpenShift console in a container, connected to your cluster
```

Navigate to <http://localhost:9000/aiboms>.

## Testing

```sh
yarn test    # Jest unit tests (filter/sort/flexible-number utilities, table rendering)
yarn lint    # eslint + prettier + stylelint
yarn build   # production build
```

The `filter`/`sort`/`flexible` utilities under `src/utils/` are a direct
TypeScript port of `oc-aibom`'s `internal/aibom/{filter,sort,flexible}.go` —
same field mapping, same case-insensitive exact-match semantics, same
missing-metric/unparseable-date edge cases. Keep the two in sync if either
changes.

## Deployment

Build and push an image, then install the Helm chart:

```sh
docker build -t quay.io/my-repository/aibom-console-plugin:latest .
docker push quay.io/my-repository/aibom-console-plugin:latest

helm upgrade -i aibom-console-plugin charts/openshift-console-plugin \
  -n aibom-console-plugin --create-namespace \
  --set plugin.image=quay.io/my-repository/aibom-console-plugin:latest
```

The chart's `patch-consoles` Job (enabled by default,
`plugin.jobs.patchConsoles.enabled`) adds the plugin to the cluster's
`Console` CR automatically — no separate manual step. Disable it and edit
`Console`'s `spec.plugins` yourself if you'd rather not grant that Job's
scoped `consoles.operator.openshift.io` get/list/patch `ClusterRole`.

See `charts/openshift-console-plugin/values.yaml` for the full set of
parameters (replicas, resources, image pull secrets, etc.).
