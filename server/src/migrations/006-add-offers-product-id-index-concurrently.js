export const useTransaction = false;

export async function up({ sequelize }) {
  await sequelize.query(
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS "offers_product_id" ON "offers" ("product_id")'
  );
}

export async function down({ sequelize }) {
  await sequelize.query('DROP INDEX CONCURRENTLY IF EXISTS "offers_product_id"');
}

