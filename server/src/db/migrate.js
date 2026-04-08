import fs from "fs/promises";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import SequelizePkg from "sequelize";

const { QueryTypes } = SequelizePkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_MIGRATIONS_DIR = path.resolve(__dirname, "../migrations");
const DEFAULT_MIGRATION_LOCK_KEY = 731944021;
const INITIAL_SCHEMA_MIGRATION = "001-initial-schema.js";
const INITIAL_SCHEMA_CORE_TABLES = ["users", "products", "offers"];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureMigrationsTable(sequelize) {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function listMigrationFiles(migrationsDir) {
  const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

async function loadAppliedMigrations(sequelize) {
  const rows = await sequelize.query("SELECT name FROM schema_migrations", {
    type: QueryTypes.SELECT,
  });
  return new Set(rows.map((row) => row.name));
}

function normalizeTableName(table) {
  if (typeof table === "string") return table.toLowerCase();
  if (table?.tableName) return String(table.tableName).toLowerCase();
  if (table?.table_name) return String(table.table_name).toLowerCase();
  return String(table || "").toLowerCase();
}

async function loadExistingTables(sequelize, transaction) {
  const queryInterface = sequelize.getQueryInterface();
  const tables = await queryInterface.showAllTables({ transaction });
  return new Set(tables.map(normalizeTableName));
}

async function runMigrationUp({
  sequelize,
  migrationsDir,
  fileName,
  logger,
  shouldRecordAsApplied = true,
}) {
  const fullPath = path.join(migrationsDir, fileName);
  const migration = await import(pathToFileURL(fullPath).href);
  if (typeof migration.up !== "function") {
    throw new Error(`Migration "${fileName}" must export an up() function`);
  }
  const useTransaction = migration.useTransaction !== false;
  const queryInterface = sequelize.getQueryInterface();

  if (!useTransaction) {
    await migration.up({
      sequelize,
      queryInterface,
      transaction: undefined,
    });

    if (shouldRecordAsApplied) {
      await sequelize.query("INSERT INTO schema_migrations (name) VALUES ($1)", {
        bind: [fileName],
      });
    }

    logger?.log?.(`[MIGRATIONS] Applied ${fileName} (no transaction)`);
    return true;
  }

  const transaction = await sequelize.transaction();
  try {
    await migration.up({
      sequelize,
      queryInterface,
      transaction,
    });

    if (shouldRecordAsApplied) {
      await sequelize.query(
        "INSERT INTO schema_migrations (name) VALUES ($1)",
        { bind: [fileName], transaction }
      );
    }

    await transaction.commit();
    logger?.log?.(`[MIGRATIONS] Applied ${fileName}`);
    return true;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function repairInitialSchemaDrift({
  sequelize,
  migrationsDir,
  migrationFiles,
  appliedMigrations,
  logger,
  transaction,
}) {
  const hasInitialMigrationFile = migrationFiles.includes(INITIAL_SCHEMA_MIGRATION);
  const initialMarkedAsApplied = appliedMigrations.has(INITIAL_SCHEMA_MIGRATION);
  if (!hasInitialMigrationFile || !initialMarkedAsApplied) {
    return { repaired: false, missingTables: [] };
  }

  const existingTables = await loadExistingTables(sequelize, transaction);
  const missingCoreTables = INITIAL_SCHEMA_CORE_TABLES.filter((tableName) => !existingTables.has(tableName));
  if (missingCoreTables.length === 0) {
    return { repaired: false, missingTables: [] };
  }

  logger?.warn?.(
    `[MIGRATIONS] schema drift detected: missing core tables (${missingCoreTables.join(", ")}). Re-applying ${INITIAL_SCHEMA_MIGRATION}.`
  );

  await runMigrationUp({
    sequelize,
    migrationsDir,
    fileName: INITIAL_SCHEMA_MIGRATION,
    logger,
    shouldRecordAsApplied: false,
  });

  const tablesAfterRepair = await loadExistingTables(sequelize, transaction);
  const stillMissing = INITIAL_SCHEMA_CORE_TABLES.filter((tableName) => !tablesAfterRepair.has(tableName));
  if (stillMissing.length > 0) {
    throw new Error(
      `[MIGRATIONS] failed to repair initial schema; still missing tables: ${stillMissing.join(", ")}`
    );
  }

  logger?.log?.(
    `[MIGRATIONS] initial schema repaired successfully via ${INITIAL_SCHEMA_MIGRATION}`
  );

  return { repaired: true, missingTables: missingCoreTables };
}

async function acquireMigrationLock({
  sequelize,
  logger,
  lockKey = DEFAULT_MIGRATION_LOCK_KEY,
  lockTimeoutMs = 30000,
  lockRetryMs = 250,
}) {
  const tx = await sequelize.transaction();
  const startedAt = Date.now();

  try {
    while (Date.now() - startedAt <= lockTimeoutMs) {
      const rows = await sequelize.query("SELECT pg_try_advisory_xact_lock($1) AS locked", {
        bind: [lockKey],
        type: QueryTypes.SELECT,
        transaction: tx,
      });

      if (Boolean(rows?.[0]?.locked)) {
        logger?.log?.(`[MIGRATIONS] lock acquired (key=${lockKey})`);
        return tx;
      }

      await sleep(lockRetryMs);
    }

    throw new Error(
      `[MIGRATIONS] lock timeout after ${lockTimeoutMs}ms (key=${lockKey}); another instance may be migrating`
    );
  } catch (error) {
    try {
      await tx.rollback();
    } catch {
      // ignore rollback errors on lock acquisition failure
    }
    throw error;
  }
}

export async function runPendingMigrations({
  sequelize,
  migrationsDir = DEFAULT_MIGRATIONS_DIR,
  logger = console,
  lockKey = DEFAULT_MIGRATION_LOCK_KEY,
  lockTimeoutMs = 30000,
  lockRetryMs = 250,
} = {}) {
  if (!sequelize) {
    throw new Error("sequelize is required for runPendingMigrations()");
  }

  let lockTx;
  try {
    lockTx = await acquireMigrationLock({
      sequelize,
      logger,
      lockKey,
      lockTimeoutMs,
      lockRetryMs,
    });

    await ensureMigrationsTable(sequelize);

    const migrationFiles = await listMigrationFiles(migrationsDir);
    const applied = await loadAppliedMigrations(sequelize);
    const repairInfo = await repairInitialSchemaDrift({
      sequelize,
      migrationsDir,
      migrationFiles,
      appliedMigrations: applied,
      logger,
      transaction: lockTx,
    });

    let appliedNow = 0;

    for (const fileName of migrationFiles) {
      if (applied.has(fileName)) continue;
      await runMigrationUp({
        sequelize,
        migrationsDir,
        fileName,
        logger,
        shouldRecordAsApplied: true,
      });
      appliedNow += 1;
    }

    await lockTx.commit();

    return {
      total: migrationFiles.length,
      applied: appliedNow,
      pending: migrationFiles.length - (applied.size + appliedNow),
      repaired: repairInfo.repaired,
      repairedTables: repairInfo.missingTables,
    };
  } catch (error) {
    if (lockTx && !lockTx.finished) {
      try {
        await lockTx.rollback();
      } catch {
        // ignore rollback errors
      }
    }
    throw error;
  }
}
