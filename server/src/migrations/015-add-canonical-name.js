import SequelizePkg from "sequelize";

const { DataTypes } = SequelizePkg;

function getTableNames(queryInterface, transaction) {
  return queryInterface.showAllTables({ transaction }).then((tables) =>
    new Set(
      tables.map((table) => {
        if (typeof table === "string") return table.toLowerCase();
        if (table?.tableName) return String(table.tableName).toLowerCase();
        if (table?.table_name) return String(table.table_name).toLowerCase();
        return String(table).toLowerCase();
      })
    )
  );
}

export async function up({ sequelize, queryInterface, transaction }) {
  const existingTables = await getTableNames(queryInterface, transaction);

  if (!existingTables.has("products")) return;

  // Проверяем, существует ли уже столбец canonical_name
  const columns = await queryInterface.describeTable("products", { transaction });
  if (!columns.canonical_name) {
    await queryInterface.addColumn(
      "products",
      "canonical_name",
      {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      { transaction }
    );
  }

  // Создаём обычный индекс для ускорения группировки
  try {
    await queryInterface.addIndex(
      "products",
      ["canonical_name"],
      {
        name: "idx_products_canonical_name",
        transaction,
      }
    );
  } catch (err) {
    // индекс уже существует — игнорируем
  }

  // Заполняем canonical_name для существующих товаров
  await queryInterface.sequelize.query(`
    UPDATE products
    SET canonical_name = LOWER(
      TRIM(
        REGEXP_REPLACE(
          REGEXP_REPLACE(name, '\\s+', ' ', 'g'),
          '[^a-z0-9а-яё\\s]', '', 'g'
        )
      )
    )
    WHERE (canonical_name IS NULL OR canonical_name = '')
  `, { transaction });

  // Создаём уникальный индекс для NOT NULL canonical_name (частичный индекс)
  await queryInterface.sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS unique_products_canonical_name
    ON products (canonical_name)
    WHERE canonical_name IS NOT NULL AND canonical_name != ''
  `, { transaction });
}

export async function down({ queryInterface, transaction }) {
  await queryInterface.sequelize.query("DROP INDEX IF EXISTS unique_products_canonical_name", { transaction });
  try {
    await queryInterface.removeIndex("products", "idx_products_canonical_name", { transaction });
  } catch (err) {
    // индекс мог не существовать
  }
  await queryInterface.removeColumn("products", "canonical_name", { transaction });
}
