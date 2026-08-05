#!/usr/bin/env bash

set -euo pipefail

readonly VERCEL_CLI_VERSION="54.1.0"

if ! command -v bun >/dev/null 2>&1; then
  echo "Bun is required to deploy excali2md." >&2
  exit 1
fi

echo "Installing dependencies..."
bun install --frozen-lockfile

echo "Running tests..."
bun run test:all

echo "Typechecking..."
bun run typecheck

echo "Building the application..."
bun run build

if [[ ! -f .vercel/project.json ]]; then
  echo "Linking this checkout to a Vercel project..."
  bunx "vercel@${VERCEL_CLI_VERSION}" link
fi

echo "Pulling production settings..."
bunx "vercel@${VERCEL_CLI_VERSION}" pull --yes --environment=production

echo "Building Vercel artifacts..."
bunx "vercel@${VERCEL_CLI_VERSION}" build --prod

echo "Deploying to production..."
bunx "vercel@${VERCEL_CLI_VERSION}" deploy --prebuilt --prod
