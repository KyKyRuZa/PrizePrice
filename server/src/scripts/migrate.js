import { sequelize } from "../models/index.js";
import { runPendingMigrations } from "../db/migrate.js";

async function main() {
  try {
    await sequelize.authenticate();
    const result = await runPendingMigrations({ sequelize });
    console.log(
      `[MIGRATIONS] done: applied=${result.applied}, total=${result.total}, pending=${result.pending}`
    );
  } finally {
    await sequelize.close();
  }
}

main().catch((error) => {
  console.error("[MIGRATIONS] failed:", error);
  process.exit(1);
});
