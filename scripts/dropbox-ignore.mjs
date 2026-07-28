// Keeps Dropbox out of this project's build/dependency folders.
//
// The repo lives inside a Dropbox folder, and Dropbox opens handles on files it
// finds there. That fights with the way Next rewrites and tears down `.next`:
// EPERM on Turbopack's atomic renames ("operation not permitted, rename ...
// build-manifest.json.tmp") during dev, and EBUSY on `rmdir .next/export` at the
// "Finalizing page optimization" step of a build.
//
// Two mechanisms are used, because one is not enough:
//
//  1. `node_modules` gets Dropbox's supported opt-out marker — an NTFS alternate
//     data stream named `com.dropbox.ignored` on the folder. This stops Dropbox
//     *uploading* the tree, which is what matters for a folder that large.
//
//  2. `.next` is redirected out of the Dropbox tree entirely, via an NTFS
//     directory junction pointing at %LOCALAPPDATA%. Next still sees `.next` in
//     the project (which `distDir` requires — it may not leave the project
//     directory), but the actual files live where Dropbox never looks.
//
// The marker alone does NOT fix `.next`, which is worth recording because it is
// the obvious thing to reach for. Measured on this machine with a harness that
// writes an export-shaped tree, waits 2s, then removes it — 10 iterations each:
//
//     inside Dropbox, unmarked ......... 5/10 failed (EPERM/EBUSY on rmdir)
//     inside Dropbox, marked ignored ... 5/6  failed
//     outside Dropbox .................. 0/10 failed
//     inside Dropbox, via junction ..... 0/10 failed
//
// The marker tells Dropbox not to sync a folder; it does not stop Dropbox from
// opening a handle on it first. Only getting the files out of the watched tree
// removes the race, rather than narrowing it.
//
// Windows-only by nature (NTFS + Dropbox); a no-op everywhere else, and never
// fatal: a failure here must not block dev or build.

import { lstatSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, join } from 'node:path';

if (process.platform !== 'win32' || process.env.VERCEL || process.env.CI) {
  process.exit(0);
}

const root = process.cwd();

// Only bother if the project actually sits inside a Dropbox tree.
if (!root.toLowerCase().includes('\\dropbox\\')) {
  process.exit(0);
}

// Writing to "<path>:com.dropbox.ignored" targets the alternate data stream.
function markIgnored(dir) {
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(`${dir}:com.dropbox.ignored`, '1');
  } catch {
    // Best-effort only — never break the dev/build run over this.
  }
}

function linkTypeOf(path) {
  try {
    return lstatSync(path).isSymbolicLink() ? 'junction' : 'dir';
  } catch {
    return 'missing';
  }
}

// Dropbox is still holding handles on the way out, so a delete right after a
// build loses the same race the build does — observed needing the better part of
// ten seconds to come free. Retry generously rather than give up; this only runs
// when `.next` is not already a junction, not on every build.
function removeWithRetry(path) {
  try {
    rmSync(path, { recursive: true, force: true, maxRetries: 60, retryDelay: 250 });
    return linkTypeOf(path) === 'missing';
  } catch {
    return false;
  }
}

// Per-project (and per-worktree) so the checkouts of this repo don't share one
// build directory. The hash keeps sibling worktrees apart; the basename is only
// there to keep the path readable.
//
// Layout of the container this returns:
//
//   <container>\dist ............ what `.next` points at
//   <container>\node_modules .... junction back to the project's node_modules
//
// The second one is load-bearing. Node resolves a junction to its real path
// before resolving `require`, so code running out of `<container>\dist` looks
// for node_modules alongside *that* path, not in the project — without this it
// fails with "Cannot find module '@tailwindcss/postcss'" while compiling CSS.
// It has to sit beside `dist` rather than inside it, because `.next/node_modules`
// is a real directory Next vendors its own server deps into.
function containerFor(projectRoot) {
  const base = process.env.LOCALAPPDATA || process.env.TEMP;
  if (!base) return null;
  const hash = createHash('sha1').update(projectRoot.toLowerCase()).digest('hex').slice(0, 12);
  return join(base, 'skyline-next-build', `${basename(projectRoot)}-${hash}`);
}

function ensureJunction(link, target) {
  if (linkTypeOf(link) === 'junction') return true;
  try {
    mkdirSync(target, { recursive: true });
    symlinkSync(target, link, 'junction');
    return true;
  } catch {
    return false;
  }
}

function redirectNextOutOfDropbox() {
  const container = containerFor(root);
  if (!container) return false;

  const link = join(root, '.next');
  const dist = join(container, 'dist');
  const existing = linkTypeOf(link);

  // A real `.next` directory here is either a pre-junction checkout or a build
  // that ran without this script. Clear it so the junction can take its place.
  if (existing === 'dir' && !removeWithRetry(link)) return false;

  // `.next` being absent is how everything expresses "clean build" — a manual
  // delete, or `rm -rf .next`. Honour that by clearing the redirect target too,
  // otherwise the junction would silently restore the previous build's output.
  // Only ever `dist` is cleared, never the container, so the removal can't walk
  // through the node_modules junction into the real dependency tree.
  if (existing !== 'junction') removeWithRetry(dist);

  // Unconditional, so a junction left dangling by a %LOCALAPPDATA% cleanup gets
  // its target back instead of every write through `.next` failing.
  try {
    mkdirSync(dist, { recursive: true });
  } catch {
    return false;
  }

  return ensureJunction(join(container, 'node_modules'), join(root, 'node_modules'))
    && ensureJunction(link, dist);
}

// Before the redirect, which junctions back to this path — so it exists even on
// a checkout that has not been installed yet.
markIgnored(join(root, 'node_modules'));

const redirected = redirectNextOutOfDropbox();

// If the junction could not be created — no %LOCALAPPDATA%, a locked `.next`, a
// filesystem without reparse points — fall back to marking `.next` and the
// subdirectories the build is known to write. That narrows the race instead of
// closing it, which is better than nothing.
if (!redirected) {
  for (const name of ['.next', '.next/cache', '.next/dev', '.next/export', '.next/server', '.next/static', '.next/types']) {
    markIgnored(join(root, name));
  }
}
