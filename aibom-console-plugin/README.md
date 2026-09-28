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

## Features

- **List view**: Filter/sort AIBOMs across a namespace or all projects (mirroring `oc-aibom list`)
- **Detail view**: Full field breakdown — model, dataset, environment, performance tables (mirroring `oc-aibom describe`)
- **Compare view**: Side-by-side comparison of 2+ AIBOMs with hardware/inference metrics and delta calculations
- **Telemetry tab**: Live Prometheus charts for GPU, CPU, memory, network, and inference metrics (vLLM)

## Prerequisites

- `aibom-webhook-service`'s CRD (`aiboms.aibom.io`) and its `aibom-view`
  aggregated `ClusterRole` installed on the cluster. A user with `view` on a
  namespace can already browse AIBOMs there through this plugin — including
  the Telemetry tab's live charts — with no extra RBAC grant.
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

## Building & Pushing

### Container image

Build the image locally:

```sh
just docker-build
```

Push to Quay (requires `docker login quay.io`):

```sh
just docker-push
```

Or build, push, and deploy in one go:

```sh
just deploy-local
```

Images auto-build on every push to main via Quay's GitHub build trigger, pushing both `:latest` (mutable) and `:${commit_sha}` (immutable) tags. One-time setup: add a GitHub build trigger in the Quay UI for this repo (branch `main`, Dockerfile `/Dockerfile`).

### Helm chart

Push the chart to Quay (requires `helm registry login quay.io`):

```sh
just chart-push
```

This publishes both a mutable version tag (e.g., `0.1.0`) and an immutable SHA-pinned tag (e.g., `0.1.0-abc1234`) for rollback safety.

## Deployment

Log in to your cluster and deploy:

```sh
oc login
just deploy
```

This pulls the latest chart and image from `quay.io/gsanders/aibom-console-plugin` and installs to the `aibom-console-plugin` namespace.

### Common options

Pin a specific version:

```sh
just deploy --version=0.1.0-abc1234
```

Deploy from a different Quay org or with custom values:

```sh
just deploy --repo=quay.io/your-org --values=values-prod.yaml
```

Or use Helm directly:

```sh
helm upgrade -i aibom-console-plugin oci://quay.io/gsanders/aibom-console-plugin \
  -n aibom-console-plugin --create-namespace
```

See `charts/openshift-console-plugin/values.yaml` for all configuration options.
