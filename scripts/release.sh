#!/usr/bin/env bash
# scripts/release.sh — cut a new excali2md release.
#
# Usage: ./scripts/release.sh [patch|minor|major|X.Y.Z]
#   e.g. ./scripts/release.sh               # patch bump (default)
#        ./scripts/release.sh minor
#        ./scripts/release.sh 0.1.0
#
# The release workflow validates server-side: its gates job runs the full
# battery (test, typecheck, build) on the tagged commit and the publish job
# depends on it, so a red run publishes nothing. This script stays fast:
# sanity checks, bump, tag, push.
#
# Policy: change-commits and release-commits are separate. Run this only
# after your changes are committed and pushed to main.

set -euo pipefail

VERSION_ARG="${1:-patch}"
if [ "$VERSION_ARG" = "-h" ] || [ "$VERSION_ARG" = "--help" ]; then
  sed -n '2,/^$/p' "$0" | head -n 6
  exit 0
fi

CURRENT=$(grep '"version"' package.json | head -1 | sed -E 's/.*"version": *"([^"]+)".*/\1/')
if [ -z "$CURRENT" ]; then
  echo "Error: couldn't read current version from package.json" >&2
  exit 1
fi

case "$VERSION_ARG" in
  patch|minor|major)
    IFS='.' read -r MAJ MIN PAT <<< "$CURRENT"
    case "$VERSION_ARG" in
      patch) VERSION="$MAJ.$MIN.$((PAT+1))" ;;
      minor) VERSION="$MAJ.$((MIN+1)).0" ;;
      major) VERSION="$((MAJ+1)).0.0" ;;
    esac
    echo "→ Bumping $VERSION_ARG: $CURRENT → $VERSION"
    ;;
  *)
    if ! [[ "$VERSION_ARG" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
      echo "Error: arg must be 'patch'|'minor'|'major' or semver X.Y.Z, got '$VERSION_ARG'" >&2
      exit 1
    fi
    VERSION="$VERSION_ARG"
    echo "→ Setting explicit version: $CURRENT → $VERSION"
    ;;
esac

TAG="v$VERSION"

# ── Pre-flight checks ─────────────────────────────────────────────────────

if [ -n "$(git status --porcelain)" ]; then
  echo "Error: working tree not clean. Commit/stash first:" >&2
  git status --short >&2
  exit 1
fi

if [ "$(git rev-parse --abbrev-ref HEAD)" != "main" ]; then
  echo "Error: must be on main" >&2
  exit 1
fi

git fetch origin main --quiet
if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
  echo "Error: local main not in sync with origin/main. Pull/push first." >&2
  exit 1
fi

if git rev-parse "$TAG" >/dev/null 2>&1 || git ls-remote --tags origin "$TAG" 2>/dev/null | grep -q "refs/tags/$TAG$"; then
  echo "Error: tag '$TAG' already exists (locally or on origin)." >&2
  exit 1
fi

# ── Rollback trap (local only; a completed push can't be undone here) ─────

PRE_SHA=$(git rev-parse HEAD)
cleanup_on_failure() {
  echo "Release failed. Rolling back local state..." >&2
  git reset --hard "$PRE_SHA" >/dev/null 2>&1 || true
  git tag -d "$TAG" >/dev/null 2>&1 || true
  rm -f CHANGELOG.md.tmp
  echo "Local state restored to $PRE_SHA. If a push already completed, origin may hold the release commit." >&2
}
trap cleanup_on_failure ERR

# ── CHANGELOG gate ────────────────────────────────────────────────────────

if [ ! -f CHANGELOG.md ]; then
  echo "Error: CHANGELOG.md not found at repo root." >&2
  exit 1
fi
UNRELEASED_BODY=$(awk '
  /^## \[Unreleased\]/ { flag=1; next }
  /^## / { flag=0 }
  flag
' CHANGELOG.md | tr -d '[:space:]')
if [ -z "$UNRELEASED_BODY" ]; then
  echo "Error: '## [Unreleased]' section in CHANGELOG.md is empty." >&2
  echo "Add user-facing entries under it before tagging $TAG." >&2
  exit 1
fi
echo "  ✓ Unreleased section has content."

# ── Bump + commit + tag + push ────────────────────────────────────────────

echo "→ Bumping version to $VERSION..."
bun run scripts/bump.ts "$VERSION"

echo "→ Promoting CHANGELOG.md [Unreleased] → [$VERSION]..."
RELEASE_DATE=$(date -u +%Y-%m-%d)
awk -v ver="$VERSION" -v date="$RELEASE_DATE" '
  /^## \[Unreleased\]/ {
    print "## [Unreleased]"
    print ""
    print "## [" ver "] - " date
    next
  }
  { print }
' CHANGELOG.md > CHANGELOG.md.tmp && mv CHANGELOG.md.tmp CHANGELOG.md

echo "→ Committing release..."
git add -A
git commit -m "chore(release): v$VERSION"
git tag "$TAG"

echo "→ Pushing main + tag..."
git push origin main
git push origin "$TAG"

# Push is the point of no return — rolling back local doesn't undo the push.
trap - ERR

echo ""
echo "✓ v$VERSION pushed."
echo "Next: gh run watch   # wait for the release workflow to publish"
