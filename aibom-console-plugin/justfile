# Run `just` with no arguments to see this list.
default:
    @just --list

# quay.io org/user to push charts to, e.g. quay.io/<your-org>.
# Override per-invocation with --repo=<repo>.
default_repo := "quay.io/gsanders"
values_file := ""

# --- Chart publishing --------------------------------------------------------
#
# Packages the console plugin chart and pushes it as an OCI artifact to Quay,
# so `helm upgrade --install ... oci://quay.io/<org>/aibom-console-plugin`
# works with no checked-out copy of this repo. One-time setup: `helm registry
# login quay.io` with an account/robot that has push access under that org,
# and (in the Quay UI) make the chart repo public, or install accepts
# credentials some other way.
#
# Publishes the chart under two tags per run, mirroring the images' own
# mutable-latest/immutable-<sha> split:
#   - <Chart.yaml version> (e.g. 0.1.0) — mutable, overwritten on every
#     chart-push, since Chart.yaml's version isn't bumped automatically.
#     `helm upgrade --install ... oci://.../aibom-console-plugin` with no
#     --version resolves here.
#   - <Chart.yaml version>-<git sha> (e.g. 0.1.0-abc1234, "-dirty" suffixed if
#     the working tree has uncommitted changes) — immutable, one per
#     chart-push, for pinning/rollback.
#
# Usage: just chart-push [--repo=<repo>]
[group('charts')]
chart-push *args values_file:
    #!/usr/bin/env bash
    set -euo pipefail
    repo="{{ default_repo }}"
    for arg in {{ args }}; do
        case "$arg" in
            --repo=*) repo="${arg#--repo=}" ;;
            *) echo "error: unknown argument '$arg' (expected --repo=<repo>)" >&2; exit 1 ;;
        esac
    done
    pkg_dir="$(mktemp -d)"
    trap 'rm -rf "$pkg_dir"' EXIT
    sha="$(git rev-parse --short HEAD)"
    git diff --quiet HEAD || sha="${sha}-dirty"
    chart_dir="openshift-console-plugin"
    chart_name="$(grep '^name:' "charts/$chart_dir/Chart.yaml" | awk '{print $2}')"
    base_version="$(grep '^version:' "charts/$chart_dir/Chart.yaml" | awk '{print $2}')"
    pinned_version="${base_version}-${sha}"
    helm package "charts/$chart_dir" -d "$pkg_dir" --values "$values_file"
    helm package "charts/$chart_dir" -d "$pkg_dir" --version "$pinned_version" --values "$values_file"
    helm push "$pkg_dir/$chart_name-$base_version.tgz" "oci://$repo"
    helm push "$pkg_dir/$chart_name-${pinned_version}.tgz" "oci://$repo"
    echo "pushed oci://$repo/$chart_name — mutable: $base_version, pin with: --version=$pinned_version"
