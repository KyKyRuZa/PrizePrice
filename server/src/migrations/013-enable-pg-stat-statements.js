export async function up({ sequelize, queryInterface, transaction }) {
  await sequelize.query(
    `CREATE EXTENSION IF NOT EXISTS pg_stat_statements`,
    { transaction }
  );
}

export async function down({ queryInterface, transaction }) {
}