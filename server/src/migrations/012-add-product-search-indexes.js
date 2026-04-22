export async function up({ sequelize, queryInterface, transaction }) {
  await sequelize.query(
    `CREATE INDEX IF NOT EXISTS "idx_products_category_rating" ON "products" ("category", "rating" DESC)`,
    { transaction }
  );

  await sequelize.query(
    `CREATE INDEX IF NOT EXISTS "idx_products_category_reviews" ON "products" ("category", "reviews" DESC)`,
    { transaction }
  );

  await sequelize.query(
    `CREATE INDEX IF NOT EXISTS "idx_products_category_is_best_price" ON "products" ("category", "is_best_price", "reviews" DESC)`,
    { transaction }
  );

  await sequelize.query(
    `CREATE INDEX IF NOT EXISTS "idx_offers_product_price" ON "offers" ("product_id", "price" ASC)`,
    { transaction }
  );

  await sequelize.query(
    `CREATE INDEX IF NOT EXISTS "idx_search_history_user_created" ON "search_history" ("user_id", "created_at" DESC)`,
    { transaction }
  );

  await sequelize.query(
    `CREATE INDEX IF NOT EXISTS "idx_browsing_history_user_viewed" ON "browsing_history" ("user_id", "viewed_at" DESC)`,
    { transaction }
  );
}

export async function down({ sequelize, queryInterface, transaction }) {
  await sequelize.query(
    `DROP INDEX IF EXISTS "idx_products_category_rating"`,
    { transaction }
  );

  await sequelize.query(
    `DROP INDEX IF EXISTS "idx_products_category_reviews"`,
    { transaction }
  );

  await sequelize.query(
    `DROP INDEX IF EXISTS "idx_products_category_is_best_price"`,
    { transaction }
  );

  await sequelize.query(
    `DROP INDEX IF EXISTS "idx_offers_product_price"`,
    { transaction }
  );

  await sequelize.query(
    `DROP INDEX IF EXISTS "idx_search_history_user_created"`,
    { transaction }
  );

  await sequelize.query(
    `DROP INDEX IF EXISTS "idx_browsing_history_user_viewed"`,
    { transaction }
  );
}