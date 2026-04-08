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

async function createIndexIfNotExists(sequelize, indexName, tableName, columns, transaction) {
  const quotedColumns = columns.map((c) => `"${c}"`).join(", ");
  await sequelize.query(
    `CREATE INDEX IF NOT EXISTS "${indexName}" ON "${tableName}" (${quotedColumns})`,
    { transaction }
  );
}

async function createUniqueIndexIfNotExists(sequelize, indexName, tableName, columns, transaction) {
  const quotedColumns = columns.map((c) => `"${c}"`).join(", ");
  await sequelize.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS "${indexName}" ON "${tableName}" (${quotedColumns})`,
    { transaction }
  );
}

export async function up({ sequelize, queryInterface, transaction }) {
  const existingTables = await getTableNames(queryInterface, transaction);
  const now = Sequelize.literal("CURRENT_TIMESTAMP");

  if (!existingTables.has("users")) {
    await queryInterface.createTable(
      "users",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        phone: { type: DataTypes.TEXT, allowNull: false, unique: true },
        email: { type: DataTypes.TEXT, allowNull: true, unique: true },
        name: { type: DataTypes.TEXT, allowNull: true, unique: true },
        password_hash: { type: DataTypes.TEXT, allowNull: true },
        password_updated_at: { type: DataTypes.DATE, allowNull: true },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: now },
      },
      { transaction }
    );
  }

  if (!existingTables.has("products")) {
    await queryInterface.createTable(
      "products",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true },
        name: { type: DataTypes.TEXT, allowNull: false },
        category: { type: DataTypes.TEXT, allowNull: false },
        image: { type: DataTypes.TEXT, allowNull: false, defaultValue: "" },
        rating: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
        reviews: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        is_best_price: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      },
      { transaction }
    );
  }

  if (!existingTables.has("offers")) {
    await queryInterface.createTable(
      "offers",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        product_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: "products", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        marketplace: { type: DataTypes.TEXT, allowNull: false },
        price: { type: DataTypes.INTEGER, allowNull: false },
        old_price: { type: DataTypes.INTEGER, allowNull: true },
        discount: { type: DataTypes.INTEGER, allowNull: true },
        link: { type: DataTypes.TEXT, allowNull: false, defaultValue: "#" },
      },
      { transaction }
    );
  }

  if (!existingTables.has("favorites")) {
    await queryInterface.createTable(
      "favorites",
      {
        user_id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          references: { model: "users", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        product_id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          references: { model: "products", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: now },
      },
      { transaction }
    );
  }

  if (!existingTables.has("cart_items")) {
    await queryInterface.createTable(
      "cart_items",
      {
        user_id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          references: { model: "users", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        product_id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          references: { model: "products", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: now },
      },
      { transaction }
    );
  }

  if (!existingTables.has("search_history")) {
    await queryInterface.createTable(
      "search_history",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: "users", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        query: { type: DataTypes.TEXT, allowNull: false },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: now },
      },
      { transaction }
    );
  }

  if (!existingTables.has("price_watch")) {
    await queryInterface.createTable(
      "price_watch",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: "users", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        product_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: "products", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        target_price: { type: DataTypes.INTEGER, allowNull: true },
        drop_percent: { type: DataTypes.INTEGER, allowNull: true },
        active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        last_seen_price: { type: DataTypes.INTEGER, allowNull: true },
        last_checked_at: { type: DataTypes.DATE, allowNull: true },
        last_notified_at: { type: DataTypes.DATE, allowNull: true },
        last_notified_price: { type: DataTypes.INTEGER, allowNull: true },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: now },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: now },
      },
      { transaction }
    );
  }

  if (!existingTables.has("price_history")) {
    await queryInterface.createTable(
      "price_history",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        product_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: "products", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        marketplace: { type: DataTypes.TEXT, allowNull: false },
        price: { type: DataTypes.INTEGER, allowNull: false },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: now },
      },
      { transaction }
    );
  }

  if (!existingTables.has("notifications")) {
    await queryInterface.createTable(
      "notifications",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: "users", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        type: { type: DataTypes.TEXT, allowNull: false, defaultValue: "PRICE" },
        product_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: "products", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        title: { type: DataTypes.TEXT, allowNull: false },
        body: { type: DataTypes.TEXT, allowNull: false },
        link: { type: DataTypes.TEXT, allowNull: false, defaultValue: "" },
        read: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: now },
      },
      { transaction }
    );
  }

  if (!existingTables.has("browsing_history")) {
    await queryInterface.createTable(
      "browsing_history",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: "users", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        product_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: "products", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        viewed_at: { type: DataTypes.DATE, allowNull: false, defaultValue: now },
      },
      { transaction }
    );
  }

  await createUniqueIndexIfNotExists(
    sequelize,
    "price_watch_user_id_product_id",
    "price_watch",
    ["user_id", "product_id"],
    transaction
  );
  await createIndexIfNotExists(
    sequelize,
    "price_history_product_id_created_at",
    "price_history",
    ["product_id", "created_at"],
    transaction
  );
  await createIndexIfNotExists(
    sequelize,
    "notifications_user_id_created_at",
    "notifications",
    ["user_id", "created_at"],
    transaction
  );
  await createIndexIfNotExists(
    sequelize,
    "browsing_history_user_id_viewed_at",
    "browsing_history",
    ["user_id", "viewed_at"],
    transaction
  );
  await createIndexIfNotExists(
    sequelize,
    "browsing_history_product_id",
    "browsing_history",
    ["product_id"],
    transaction
  );
}

export async function down({ queryInterface, transaction }) {
  const existingTables = await getTableNames(queryInterface, transaction);
  const dropIfExists = async (tableName) => {
    if (existingTables.has(tableName.toLowerCase())) {
      await queryInterface.dropTable(tableName, { transaction });
    }
  };

  await dropIfExists("browsing_history");
  await dropIfExists("notifications");
  await dropIfExists("price_history");
  await dropIfExists("price_watch");
  await dropIfExists("search_history");
  await dropIfExists("cart_items");
  await dropIfExists("favorites");
  await dropIfExists("offers");
  await dropIfExists("products");
  await dropIfExists("users");
}
