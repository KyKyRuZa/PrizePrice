/**
 * Cutover marker migration for backend runtime refactor.
 *
 * Scope:
 * - Legacy runtime entrypoints (`src/routes.js`, `src/watcher.js`) are retired.
 * - Modular runtime (`src/routes/index.js`, `src/jobs/priceWatcher.js`) is canonical.
 *
 * There are no schema changes in this migration; applying it records that the
 * deployment has passed the code cutover boundary.
 */
export async function up() {
  // no-op by design
}

export async function down() {
  // no-op by design
}
