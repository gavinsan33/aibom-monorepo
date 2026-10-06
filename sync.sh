#!/usr/bin/env bash
# One-way mirror: pull each project's default branch from GitHub into its folder.
# Each source repo is rewritten with git-filter-repo so its files live under <project>/
# with their original commit messages. The rewrite is deterministic, so already-synced
# commits keep identical hashes and only new commits are added.
# Never commit directly under the project folders; changes belong in the source repos.
set -euo pipefail

OWNER=gavinsan33
PROJECTS=(aibom-console-plugin aibom-webhook-service oc-aibom)

cd "$(git rev-parse --show-toplevel)"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree is not clean; commit or stash first." >&2
  exit 1
fi

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

for p in "${PROJECTS[@]}"; do
  url="https://github.com/$OWNER/$p.git"
  echo "== $p"

  git clone -q --no-local "$url" "$tmp/$p"
  branch=$(git -C "$tmp/$p" symbolic-ref --short HEAD)
  git -C "$tmp/$p" filter-repo --quiet \
    --to-subdirectory-filter "$p" --tag-rename ":$p/"

  git fetch -q --no-tags "$tmp/$p" "refs/heads/$branch"
  tip=$(git rev-parse FETCH_HEAD)
  git fetch -q --no-tags "$tmp/$p" "+refs/tags/*:refs/tags/*"

  if git merge-base --is-ancestor "$tip" HEAD; then
    echo "   $branch: already up to date"
    continue
  fi
  flags=()
  git merge-base HEAD "$tip" >/dev/null 2>&1 || flags+=(--allow-unrelated-histories)
  if ! git merge --no-edit "${flags[@]}" -m "Sync $p from $branch" "$tip"; then
    echo "Merge failed for $p. Resolve or run 'git merge --abort'." >&2
    exit 1
  fi
done
