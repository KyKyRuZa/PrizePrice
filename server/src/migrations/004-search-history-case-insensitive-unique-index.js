export async function up({ sequelize, transaction }) {
  // Keep only the latest row for duplicate (user_id, lower(query)) pairs.
  await sequelize.query(
    `
      DELETE FROM search_history old_rows
      USING search_history new_rows
      WHERE old_rows.user_id = new_rows.user_id
        AND lower(old_rows.query) = lower(new_rows.query)
        AND old_rows.id < new_rows.id
    `,
    { transaction }
  );

  await sequelize.query(
    `
      CREATE UNIQUE INDEX IF NOT EXISTS "search_history_user_id_lower_query_idx"
      ON "search_history" ("user_id", lower("query"))
    `,
    { transaction }
  );
}

export async function down({ sequelize, transaction }) {
  await sequelize.query(
    `DROP INDEX IF EXISTS "search_history_user_id_lower_query_idx"`,
    { transaction }
  );
}
