import SequelizePkg from "sequelize";
import { config } from "../config/index.js";
import { products as seedProducts } from "../data/products.data.js";
import { runPendingMigrations } from "../db/migrate.js";

const { Sequelize, DataTypes, Op } = SequelizePkg;

// Sequelize instance
export const sequelize = new Sequelize(config.databaseUrl, {
  dialect: "postgres",
  logging: false,
});

// --- Models ---

export const User = sequelize.define(
  "User",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    phone: { type: DataTypes.TEXT, allowNull: false, unique: true },
    email: { type: DataTypes.TEXT, allowNull: true, unique: true },
    name: { type: DataTypes.TEXT, allowNull: true, unique: true },
    passwordHash: { type: DataTypes.TEXT, allowNull: true, field: "password_hash" },
    passwordUpdatedAt: { type: DataTypes.DATE, allowNull: true, field: "password_updated_at" },
  },
  {
    tableName: "users",
    timestamps: true,
    updatedAt: false,
    underscored: true,
  }
);

export const Product = sequelize.define(
  "Product",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true },
    name: { type: DataTypes.TEXT, allowNull: false },
    category: { type: DataTypes.TEXT, allowNull: false },
    image: { type: DataTypes.TEXT, allowNull: false, defaultValue: "" },
    rating: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    reviews: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    isBestPrice: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: "is_best_price" },
  },
  {
    tableName: "products",
    timestamps: false,
    underscored: true,
  }
);

export const Offer = sequelize.define(
  "Offer",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    productId: { type: DataTypes.INTEGER, allowNull: false, field: "product_id" },
    marketplace: { type: DataTypes.TEXT, allowNull: false },
    price: { type: DataTypes.INTEGER, allowNull: false },
    oldPrice: { type: DataTypes.INTEGER, allowNull: true, field: "old_price" },
    discount: { type: DataTypes.INTEGER, allowNull: true },
    link: { type: DataTypes.TEXT, allowNull: false, defaultValue: "#" },
  },
  {
    tableName: "offers",
    timestamps: false,
    underscored: true,
  }
);

export const Favorite = sequelize.define(
  "Favorite",
  {
    userId: { type: DataTypes.INTEGER, primaryKey: true, field: "user_id" },
    productId: { type: DataTypes.INTEGER, primaryKey: true, field: "product_id" },
  },
  {
    tableName: "favorites",
    timestamps: true,
    updatedAt: false,
    underscored: true,
  }
);

export const CartItem = sequelize.define(
  "CartItem",
  {
    userId: { type: DataTypes.INTEGER, primaryKey: true, field: "user_id" },
    productId: { type: DataTypes.INTEGER, primaryKey: true, field: "product_id" },
  },
  {
    tableName: "cart_items",
    timestamps: true,
    updatedAt: false,
    underscored: true,
  }
);

export const SearchHistory = sequelize.define(
  "SearchHistory",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, field: "user_id" },
    query: { type: DataTypes.TEXT, allowNull: false },
  },
  {
    tableName: "search_history",
    timestamps: true,
    updatedAt: false,
    underscored: true,
  }
);

export const PriceWatch = sequelize.define(
  "PriceWatch",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, field: "user_id" },
    productId: { type: DataTypes.INTEGER, allowNull: false, field: "product_id" },
    targetPrice: { type: DataTypes.INTEGER, allowNull: true, field: "target_price" },
    dropPercent: { type: DataTypes.INTEGER, allowNull: true, field: "drop_percent" },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },

    lastSeenPrice: { type: DataTypes.INTEGER, allowNull: true, field: "last_seen_price" },
    lastCheckedAt: { type: DataTypes.DATE, allowNull: true, field: "last_checked_at" },
    lastNotifiedAt: { type: DataTypes.DATE, allowNull: true, field: "last_notified_at" },
    lastNotifiedPrice: { type: DataTypes.INTEGER, allowNull: true, field: "last_notified_price" },
  },
  {
    tableName: "price_watch",
    timestamps: true,
    underscored: true,
    indexes: [{ unique: true, fields: ["user_id", "product_id"] }],
  }
);

export const PriceHistory = sequelize.define(
  "PriceHistory",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    productId: { type: DataTypes.INTEGER, allowNull: false, field: "product_id" },
    marketplace: { type: DataTypes.TEXT, allowNull: false },
    price: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    tableName: "price_history",
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [{ fields: ["product_id", "created_at"] }],
  }
);

export const Notification = sequelize.define(
  "Notification",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, field: "user_id" },
    type: { type: DataTypes.TEXT, allowNull: false, defaultValue: "PRICE" },
    productId: { type: DataTypes.INTEGER, allowNull: true, field: "product_id" },
    title: { type: DataTypes.TEXT, allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    link: { type: DataTypes.TEXT, allowNull: false, defaultValue: "" },
    read: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  {
    tableName: "notifications",
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [{ fields: ["user_id", "created_at"] }],
  }
);

export const BrowsingHistory = sequelize.define(
  "BrowsingHistory",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, field: "user_id" },
    productId: { type: DataTypes.INTEGER, allowNull: false, field: "product_id" },
    viewedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "viewed_at" },
  },
  {
    tableName: "browsing_history",
    timestamps: false,
    underscored: true,
    indexes: [
      { fields: ["user_id", "viewed_at"] },
      { fields: ["product_id"] }
    ],
  }
);

// --- Associations ---
Product.hasMany(Offer, { as: "offers", foreignKey: "productId" });
Offer.belongsTo(Product, { as: "product", foreignKey: "productId" });

User.belongsToMany(Product, { through: Favorite, as: "favoriteProducts", foreignKey: "userId", otherKey: "productId" });
Product.belongsToMany(User, { through: Favorite, as: "favoritedBy", foreignKey: "productId", otherKey: "userId" });

User.belongsToMany(Product, { through: CartItem, as: "cartProducts", foreignKey: "userId", otherKey: "productId" });
Product.belongsToMany(User, { through: CartItem, as: "inCarts", foreignKey: "productId", otherKey: "userId" });

User.hasMany(SearchHistory, { as: "history", foreignKey: "userId" });
SearchHistory.belongsTo(User, { as: "user", foreignKey: "userId" });

User.hasMany(PriceWatch, { as: "priceWatches", foreignKey: "userId" });
PriceWatch.belongsTo(User, { as: "user", foreignKey: "userId" });
Product.hasMany(PriceWatch, { as: "priceWatches", foreignKey: "productId" });
PriceWatch.belongsTo(Product, { as: "product", foreignKey: "productId" });

Product.hasMany(PriceHistory, { as: "priceHistory", foreignKey: "productId" });
PriceHistory.belongsTo(Product, { as: "product", foreignKey: "productId" });

User.hasMany(Notification, { as: "notifications", foreignKey: "userId" });
Notification.belongsTo(User, { as: "user", foreignKey: "userId" });
Notification.belongsTo(Product, { as: "product", foreignKey: "productId" });

User.hasMany(BrowsingHistory, { as: "browsingHistory", foreignKey: "userId" });
BrowsingHistory.belongsTo(User, { as: "user", foreignKey: "userId" });
BrowsingHistory.belongsTo(Product, { as: "product", foreignKey: "productId" });

export const db = {
  sequelize,
  User,
  Product,
  Offer,
  Favorite,
  CartItem,
  SearchHistory,
  PriceWatch,
  PriceHistory,
  Notification,
  BrowsingHistory,
  Op,
};

export async function initDb() {
  await sequelize.authenticate();
  if (!config.runDbMigrationsOnBoot) {
    return { total: 0, applied: 0, pending: 0 };
  }
  return runPendingMigrations({ sequelize });
}

export async function seedDbIfEmpty() {
  const productCount = await Product.count();
  const offerCount = await Offer.count();

  // If you already have products but offers are empty (common when updating the project),
  // we still seed offers so the UI can calculate best prices.
  if (productCount > 0 && offerCount > 0) return;

  const tx = await sequelize.transaction();
  try {
    if (productCount === 0) {
      await Product.bulkCreate(
        seedProducts.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          image: p.image || "",
          rating: p.rating || 0,
          reviews: p.reviews || 0,
          isBestPrice: Boolean(p.isBestPrice),
        })),
        { transaction: tx }
      );
    }

    if (offerCount === 0) {
      const offers = [];
      for (const p of seedProducts) {
        for (const o of p.prices || []) {
          offers.push({
            productId: p.id,
            marketplace: o.marketplace,
            price: o.price,
            oldPrice: o.oldPrice ?? null,
            discount: o.discount ?? null,
            link: o.link || "#",
          });
        }
      }
      if (offers.length) {
        await Offer.bulkCreate(offers, { transaction: tx });
      }
    }

    await tx.commit();
  } catch (e) {
    await tx.rollback();
    throw e;
  }
}
