import SequelizePkg from "sequelize";

const { DataTypes } = SequelizePkg;

export async function up({ queryInterface, transaction }) {
  const existingTables = await getTableNames(queryInterface, transaction);

  if (!existingTables.has("sms_logs")) {
    await queryInterface.createTable("sms_logs", {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        field: "user_id",
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "phone",
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "type",
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "status",
      },
      provider_message_id: {
        type: DataTypes.STRING,
        allowNull: true,
        field: "provider_message_id",
      },
      cost_cents: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "cost_cents",
      },
      error_message: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "error_message",
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        field: "metadata",
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        field: "created_at",
      },
    });

    await queryInterface.addIndex("sms_logs", ["user_id"], {
      name: "idx_sms_logs_user_id",
    });
    await queryInterface.addIndex("sms_logs", ["created_at"], {
      name: "idx_sms_logs_created",
    });
    await queryInterface.addIndex("sms_logs", ["phone", "created_at"], {
      name: "idx_sms_logs_phone_created",
    });
  }
}

export async function down({ queryInterface, transaction }) {
  await queryInterface.dropTable("sms_logs", { transaction });
}

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
