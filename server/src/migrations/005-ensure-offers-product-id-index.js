export async function up({ sequelize, transaction }) {
  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS "offers_product_id" ON "offers" ("product_id")',
    { transaction }
  );
}

export async function down({ sequelize, transaction }) {
  await sequelize.query('DROP INDEX IF EXISTS "offers_product_id"', { transaction });
}
