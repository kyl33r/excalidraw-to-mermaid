#!/usr/bin/env bun
// Bump the root package.json "version". Usage: `bun run scripts/bump.ts 0.1.1`.
// Strict X.Y.Z only — no prerelease or build suffixes, so the released tag
// always matches a real semantic version.

const version = process.argv[2];

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  process.stderr.write("usage: bun run scripts/bump.ts <major.minor.patch>\n");
  process.stderr.write("prerelease/build suffixes are rejected\n");
  process.exit(1);
}

const pkgPath = `${import.meta.dir}/../package.json`;
const pkg = JSON.parse(await Bun.file(pkgPath).text());
pkg.version = version;
await Bun.write(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

console.log(`bumped package.json version to ${version}`);
