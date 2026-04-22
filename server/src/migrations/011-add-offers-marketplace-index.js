export async function up({ sequelize, queryInterface, transaction }) {
  await sequelize.query(
    `CREATE INDEX IF NOT EXISTS "offers_marketplace_idx" ON "offers" ("marketplace")`,
    { transaction }
  );

  await sequelize.query(
    `CREATE INDEX IF NOT EXISTS "offers_product_marketplace_idx" ON "offers" ("product_id", "marketplace")`,
    { transaction }
  );
}

export async function down({ sequelize, queryInterface, transaction }) {
  await sequelize.query(
    `DROP INDEX IF EXISTS "offers_marketplace_idx"`,
    { transaction }
  );

  await sequelize.query(
    `DROP INDEX IF EXISTS "offers_product_marketplace_idx"`,
    { transaction }
  );
}