import SequelizePkg from "sequelize";

const { DataTypes, Sequelize } = SequelizePkg;

export async function up({ sequelize, queryInterface, transaction }) {
  const now = Sequelize.literal("CURRENT_TIMESTAMP");

  // Добавляем колонку last_seen
  await queryInterface.addColumn(
    "users",
    "last_seen",
    {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    { transaction }
  );

  // Создаём индекс для быстрого поиска активных пользователей
  await queryInterface.addIndex("users", ["last_seen"], {
    name: "idx_users_last_seen",
    transaction,
  });
}

export async function down({ queryInterface, transaction }) {
  await queryInterface.removeColumn("users", "last_seen", { transaction });
  await queryInterface.removeIndex("users", "idx_users_last_seen", { transaction });
}
