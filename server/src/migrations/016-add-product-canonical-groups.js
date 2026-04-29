import SequelizePkg from "sequelize";

const { DataTypes } = SequelizePkg;

export async function up({ sequelize, queryInterface, transaction }) {
  await queryInterface.removeColumn("products", "canonical_name", { transaction });

  // Create product_canonical_groups table
  await queryInterface.sequelize.query(
    `CREATE TABLE product_canonical_groups (
      id SERIAL PRIMARY KEY,
      canonical_name TEXT NOT NULL,
      product_ids INTEGER[] NOT NULL DEFAULT '{}',
      marketplaces TEXT[] NOT NULL DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
    { transaction }
  );

  // Create GIN index on product_ids for fast array search
  await queryInterface.sequelize.query(
    `CREATE INDEX idx_product_canonical_groups_product_ids 
     ON product_canonical_groups USING GIN (product_ids)`,
    { transaction }
  );

  // Create or replace trigger function for updating updated_at
  await queryInterface.sequelize.query(
    `CREATE OR REPLACE FUNCTION update_updated_at_column()
     RETURNS TRIGGER AS $$
     BEGIN
         NEW.updated_at = NOW();
         RETURN NEW;
     END;
     $$ LANGUAGE plpgsql;`,
    { transaction }
  );

  // Create trigger on product_canonical_groups
  await queryInterface.sequelize.query(
    `CREATE TRIGGER update_product_canonical_groups_updated_at
     BEFORE UPDATE ON product_canonical_groups
     FOR EACH ROW
     EXECUTE FUNCTION update_updated_at_column();`,
    { transaction }
  );
}

export async function down({ queryInterface, transaction }) {
  // Drop product_canonical_groups table (cascade will remove trigger)
  await queryInterface.sequelize.query(
    "DROP TABLE IF EXISTS product_canonical_groups CASCADE",
    { transaction }
  );

  // Drop the trigger function
  await queryInterface.sequelize.query(
    "DROP FUNCTION IF EXISTS update_updated_at_column()",
    { transaction }
  );

  // Re-add canonical_name column to products
  await queryInterface.addColumn(
    "products",
    "canonical_name",
    { type: DataTypes.TEXT, allowNull: true },
    { transaction }
  );

  // Repopulate canonical_name from product names
  await queryInterface.sequelize.query(
    `UPDATE products
     SET canonical_name = LOWER(
       TRIM(
         REGEXP_REPLACE(
           REGEXP_REPLACE(name, '\\s+', ' ', 'g'),
           '[^a-z0-9а-яё\\s]', '', 'g'
         )
       )
     )
     WHERE (canonical_name IS NULL OR canonical_name = '')`,
    { transaction }
  );

  // Re-create index idx_products_canonical_name
  try {
    await queryInterface.addIndex("products", ["canonical_name"], {
      name: "idx_products_canonical_name",
      transaction,
    });
  } catch (err) {
    // Index may already exist; ignore
  }

  // Re-create unique partial index for canonical_name
  await queryInterface.sequelize.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS unique_products_canonical_name
     ON products (canonical_name)
     WHERE canonical_name IS NOT NULL AND canonical_name != ''`,
    { transaction }
  );
}
