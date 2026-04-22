export async function up({ sequelize, queryInterface, transaction }) {
  await sequelize.query(
    `CREATE INDEX IF NOT EXISTS "idx_price_history_product_created" ON "price_history" ("product_id", "created_at" DESC)`,
    { transaction }
  );

  await sequelize.query(
    `CREATE INDEX IF NOT EXISTS "idx_price_history_product_marketplace" ON "price_history" ("product_id", "marketplace", "created_at" DESC)`,
    { transaction }
  );
}

export async function down({ sequelize, queryInterface, transaction }) {
  await sequelize.query(
    `DROP INDEX IF EXISTS "idx_price_history_product_created"`,
    { transaction }
  );

  await sequelize.query(
    `DROP INDEX IF EXISTS "idx_price_history_product_marketplace"`,
    { transaction }
  );
}