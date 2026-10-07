# Development

The plugin was scaffolded from [`openshift/console-plugin-template`](https://github.com/openshift/console-plugin-template). See that project's README for the underlying dynamic-plugin mechanics (module federation, the `ConsolePlugin` CR, i18n, linting rules).

## Running locally

```sh
yarn install
yarn start            # dev server on :9001
```

In a second terminal:

```sh
oc login
yarn start-console    # runs the OpenShift console in a container, connected to your cluster
```

Then open <http://localhost:9000/aiboms>.

## Testing

```sh
yarn test    # Jest unit tests (filter/sort/flexible-number utilities, table rendering)
yarn lint    # eslint + prettier + stylelint
yarn build   # production build
```

!!! note "Keep in sync with oc-aibom"
    The `filter`, `sort` and `flexible` utilities under `src/utils/` are a direct TypeScript port of `oc-aibom`'s `internal/aibom/{filter,sort,flexible}.go`. They use the same field mapping, the same case-insensitive exact-match semantics, and the same missing-metric and unparseable-date edge cases. If either side changes, change the other.
