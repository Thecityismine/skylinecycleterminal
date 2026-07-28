// Keeps Dropbox from syncing this project's build/dependency folders.
//
// The repo lives inside a Dropbox folder, and Dropbox's file locking fights
// with Turbopack's atomic renames inside .next — producing EPERM crashes
// ("operation not permitted, rename ... build-manifest.json.tmp") that leave
// the dev server serving 404s for every route until .next is wiped.
//
// Dropbox's supported opt-out is an NTFS alternate data stream named
// `com.dropbox.ignored` on the folder. That marker does NOT survive the
// folder being deleted and recreated (verified), which is exactly what a
// clean build does — so this runs from predev/prebuild to re-apply it.
//
// Windows-only by nature (NTFS ADS + Dropbox); a no-op everywhere else, and
// never fatal: a failure here must not block dev or build.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Marking `.next` alone is not enough. The marker is a per-folder attribute, and
// a folder created *during* the build starts unmarked — so Dropbox grabs it mid
// write and the build dies on whichever subdirectory it happened to be indexing:
// observed as EBUSY on `.next/export/_next`, `.next/server/app/(free)/price` and
// `.next/server/app/contact.segments` across consecutive runs, plus EPERM on
// Turbopack's atomic renames inside `.next/dev/server`.
//
// Pre-creating and marking the known subdirectories means the build writes into
// folders Dropbox is already ignoring instead of racing it. This narrows the
// window rather than closing it completely — a directory Next invents that isn't
// listed here can still lose the race — so `postbuild` re-applies the markers too.
const TARGETS = [
  'node_modules',
  '.next',
  '.next/cache',
  '.next/dev',
  '.next/export',
  '.next/server',
  '.next/static',
  '.next/types',
];

if (process.platform !== 'win32' || process.env.VERCEL || process.env.CI) {
  process.exit(0);
}

const root = process.cwd();

// Only bother if the project actually sits inside a Dropbox tree.
if (!root.toLowerCase().includes('\\dropbox\\')) {
  process.exit(0);
}

for (const name of TARGETS) {
  const dir = join(root, name);
  try {
    mkdirSync(dir, { recursive: true });
    // Writing to "<path>:com.dropbox.ignored" targets the alternate data stream.
    writeFileSync(`${dir}:com.dropbox.ignored`, '1');
  } catch {
    // Best-effort only — never break the dev/build run over this.
  }
}
