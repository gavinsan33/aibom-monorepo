# Run `just` with no arguments to see this list.
default:
    @just --list

# quay.io org/user to push images and charts to, e.g. quay.io/<your-org>.
# Override per-invocation with --repo=<repo>.
default_repo := "quay.io/gsanders"

# --- Container image ---------------------------------------------------------

[group('images')]
docker-build *args:
    #!/usr/bin/env bash
    set -euo pipefail
    repo="{{ default_repo }}"
    no_latest=false
    img="aibom-console-plugin:latest"
    for arg in {{ args }}; do
        case "$arg" in
            --img=*) img="${arg#--img=}" ;;
            --repo=*) repo="${arg#--repo=}" ;;
            --no-latest) no_latest=true ;;
            *) echo "error: unknown argument '$arg' (expected --img=<image>, --repo=<repo>, or --no-latest)" >&2; exit 1 ;;
        esac
    done
    if [[ "$no_latest" = true ]]; then
        sha="$(git rev-parse --short HEAD)"
        git diff --quiet HEAD || sha="${sha}-dirty"
        img="aibom-console-plugin:${sha}"
    fi
    docker build -t "$repo/$img" .

[group('images')]
docker-push *args:
    #!/usr/bin/env bash
    set -euo pipefail
    repo="{{ default_repo }}"
    no_latest=false
    img="aibom-console-plugin:latest"
    for arg in {{ args }}; do
        case "$arg" in
            --img=*) img="${arg#--img=}" ;;
            --repo=*) repo="${arg#--repo=}" ;;
            --no-latest) no_latest=true ;;
            *) echo "error: unknown argument '$arg' (expected --img=<image>, --repo=<repo>, or --no-latest)" >&2; exit 1 ;;
        esac
    done
    if [[ "$no_latest" = true ]]; then
        sha="$(git rev-parse --short HEAD)"
        git diff --quiet HEAD || sha="${sha}-dirty"
        img="aibom-console-plugin:${sha}"
    fi
    docker push "$repo/$img"

# --- Cluster deployment --------------------------------------------------------

# Every recipe below that talks to a cluster depends on this, so it always runs first.
_check-auth:
    @oc whoami >/dev/null 2>&1 || { echo "error: not logged in to a cluster — run 'oc login' first" >&2; exit 1; }

# Build the image locally and push it to quay.io, then install/upgrade the
# chart with that image. Useful for iterating without a git-push round trip.
# Requires the caller already logged in (`docker login quay.io` / `podman login
# quay.io`) with push access to that repo.
#
# Defaults to the local working tree's short SHA, suffixed "-dirty" if there
# are uncommitted changes. Pass --skip-patcher to disable the auto-patcher job
# and avoid needing cluster-admin.
# Usage: just deploy-local [--repo=<repo>] [--version=<tag>] [--values=<file>] [--namespace=<ns>] [--skip-patcher]
[group('deploy')]
deploy-local *args: _check-auth
    #!/usr/bin/env bash
    set -euo pipefail
    engine=docker
    command -v docker >/dev/null 2>&1 || engine=podman
    repo="{{ default_repo }}"
    version=""
    values_file=""
    namespace="project-aibom"
    skip_plugin_cr=false
    skip_patcher=false
    for arg in {{ args }}; do
        case "$arg" in
            --repo=*) repo="${arg#--repo=}" ;;
            --version=*) version="${arg#--version=}" ;;
            --values=*) values_file="${arg#--values=}" ;;
            --namespace=*) namespace="${arg#--namespace=}" ;;
            --skip-plugin-cr) skip_plugin_cr=true ;;
            --skip-patcher) skip_patcher=true ;;
            *) echo "error: unknown argument '$arg' (expected --repo=<repo>, --version=<tag>, --values=<file>, --namespace=<ns>, --skip-plugin-cr, or --skip-patcher)" >&2; exit 1 ;;
        esac
    done
    if [[ -z "$version" ]]; then
        version="$(git rev-parse --short HEAD)"
        git diff --quiet HEAD || version="${version}-dirty"
    fi
    img_ref="${repo}/aibom-console-plugin:${version}"
    "$engine" build -t "$img_ref" .
    "$engine" push "$img_ref"
    values_args=()
    [[ -n "$values_file" ]] && values_args=(-f "$values_file")
    [[ "$skip_plugin_cr" = true ]] && values_args+=(--set plugin.enabled=false)
    [[ "$skip_patcher" = true ]] && values_args+=(--set plugin.jobs.patchConsoles.enabled=false)
    kube_as_user_args=()
    [[ "$skip_plugin_cr" = true && "$skip_patcher" = true ]] || kube_as_user_args=(--kube-as-user=system:admin)
    helm upgrade --install aibom-console-plugin "oci://$repo/aibom-console-plugin" \
        -n "$namespace" --create-namespace \
        --set plugin.image="$img_ref" \
        "${kube_as_user_args[@]}" \
        "${values_args[@]}"

# Install/upgrade the console plugin chart from Quay. Works once images are
# built and pushed (via Quay's auto-build, `just docker-push`, or `just
# deploy-local`). Seamless default: `just deploy` pulls the mutable-latest
# tag from quay.io/gsanders/aibom-console-plugin. Override the repo or version
# to deploy a different source or pin to an immutable sha tag.
#
# By default, `just deploy` requires cluster-admin to create cluster-scoped
# resources (ConsolePlugin CR, ClusterRole/ClusterRoleBinding, patcher Job).
# Pass --skip-plugin-cr to skip creating the ConsolePlugin CR (a cluster-admin
# must create it manually). Pass --skip-patcher to only disable the auto-patcher
# job. Use both flags together to deploy with no cluster-admin access.
#
# Usage: just deploy [--repo=<repo>] [--version=<tag>] [--values=<file>] [--namespace=<ns>] [--skip-plugin-cr] [--skip-patcher]
[group('deploy')]
deploy *args: _check-auth
    #!/usr/bin/env bash
    set -euo pipefail
    repo="{{ default_repo }}"
    version="latest"
    values_file=""
    namespace="project-aibom"
    skip_plugin_cr=false
    skip_patcher=false
    for arg in {{ args }}; do
        case "$arg" in
            --repo=*) repo="${arg#--repo=}" ;;
            --version=*) version="${arg#--version=}" ;;
            --values=*) values_file="${arg#--values=}" ;;
            --namespace=*) namespace="${arg#--namespace=}" ;;
            --skip-plugin-cr) skip_plugin_cr=true ;;
            --skip-patcher) skip_patcher=true ;;
            *) echo "error: unknown argument '$arg' (expected --repo=<repo>, --version=<tag>, --values=<file>, --namespace=<ns>, --skip-plugin-cr, or --skip-patcher)" >&2; exit 1 ;;
        esac
    done
    values_args=()
    [[ -n "$values_file" ]] && values_args=(-f "$values_file")
    [[ "$skip_plugin_cr" = true ]] && values_args+=(--set plugin.enabled=false)
    [[ "$skip_patcher" = true ]] && values_args+=(--set plugin.jobs.patchConsoles.enabled=false)
    kube_as_user_args=()
    [[ "$skip_plugin_cr" = true && "$skip_patcher" = true ]] || kube_as_user_args=(--kube-as-user=system:admin)
    helm upgrade --install aibom-console-plugin "oci://$repo/aibom-console-plugin" \
        -n "$namespace" --create-namespace \
        --version "$version" \
        "${kube_as_user_args[@]}" \
        "${values_args[@]}"

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
chart-push *args:
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
    helm package "charts/$chart_dir" -d "$pkg_dir"
    helm package "charts/$chart_dir" -d "$pkg_dir" --version "$pinned_version"
    helm push "$pkg_dir/$chart_name-$base_version.tgz" "oci://$repo"
    helm push "$pkg_dir/$chart_name-${pinned_version}.tgz" "oci://$repo"
    echo "pushed oci://$repo/$chart_name — mutable: $base_version, pin with: --version=$pinned_version"
