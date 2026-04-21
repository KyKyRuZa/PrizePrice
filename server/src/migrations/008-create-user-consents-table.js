import SequelizePkg from "sequelize";

const { DataTypes, Sequelize } = SequelizePkg;

async function getTableNames(queryInterface, transaction) {
  const tables = await queryInterface.showAllTables({ transaction });
  return new Set(
    tables.map((table) => {
      if (typeof table === "string") return table.toLowerCase();
      if (table?.tableName) return String(table.tableName).toLowerCase();
      if (table?.table_name) return String(table.table_name).toLowerCase();
      return String(table).toLowerCase();
    })
  );
}

export async function up({ sequelize, queryInterface, transaction }) {
  const existingTables = await getTableNames(queryInterface, transaction);

  // Создаём таблицу user_consents, если не существует
  if (!existingTables.has("user_consents")) {
    await queryInterface.createTable("user_consents", {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      consent_type: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "consent_type",
      },
      consent_given: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        field: "consent_given",
      },
      consent_at: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "consent_at",
      },
      consent_text: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: "consent_text",
      },
      ip: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "ip",
      },
      user_agent: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: "user_agent",
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        field: "created_at",
      },
    });

    // Индексы для производительности
    await queryInterface.addIndex("user_consents", ["user_id"], {
      name: "idx_user_consents_user_id",
    });
    await queryInterface.addIndex("user_consents", ["consent_type"], {
      name: "idx_user_consents_type",
    });
    await queryInterface.addIndex("user_consents", ["user_id", "consent_type"], {
      name: "idx_user_consents_user_type",
      unique: true,
    });
  }
}

export async function down({ queryInterface, transaction }) {
  await queryInterface.dropTable("user_consents", { transaction });
}
