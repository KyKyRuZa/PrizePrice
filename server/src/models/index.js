import SequelizePkg from "sequelize";
import { config } from "../config/index.js";
import { runPendingMigrations } from "../db/migrate.js";
import { invalidate } from "../services/cache.service.js";

const { Sequelize, DataTypes, Op } = SequelizePkg;

export const sequelize = new Sequelize(config.databaseUrl, {
  dialect: "postgres",
  logging: false,
});

export const User = sequelize.define(
  "User",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    phone: { type: DataTypes.TEXT, allowNull: false, unique: true },
    email: { type: DataTypes.TEXT, allowNull: true, unique: true },
    name: { type: DataTypes.TEXT, allowNull: true, unique: true },
    passwordHash: { type: DataTypes.TEXT, allowNull: true, field: "password_hash" },
    passwordUpdatedAt: { type: DataTypes.DATE, allowNull: true, field: "password_updated_at" },
    lastSeen: { type: DataTypes.DATE, allowNull: true, field: "last_seen" },
    smsOptOut: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: "sms_opt_out" },
    smsOptOutAt: { type: DataTypes.DATE, allowNull: true, field: "sms_opt_out_at" },
    smsOptOutIp: { type: DataTypes.STRING, allowNull: true, field: "sms_opt_out_ip" },
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
    canonicalName: { type: DataTypes.TEXT, allowNull: true, field: "canonical_name" },
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

  if (productCount > 0 && offerCount > 0) return;

  const tx = await sequelize.transaction();
  try {
    if (productCount === 0) {
      // Compute canonicalName: lowercase, remove special chars, trim spaces
      const computeCanonical = (name) => {
        if (!name) return null;
        return name
          .toLowerCase()
          .replace(/[^\w\sа-яё]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      };

      await Product.bulkCreate(
        seedProducts.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          image: p.image || "",
          rating: p.rating || 0,
          reviews: p.reviews || 0,
          isBestPrice: Boolean(p.isBestPrice),
          canonicalName: computeCanonical(p.name),
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

    await invalidate("categories:list");
    await invalidate("categories:count");
  } catch (e) {
    await tx.rollback();
    throw e;
  }
}

export const UserConsent = sequelize.define(
  "UserConsent",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "user_id",
    },
    consentType: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "consent_type",
    },
    consentGiven: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      field: "consent_given",
    },
    consentAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "consent_at",
    },
    consentText: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: "consent_text",
    },
    ip: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "ip",
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: "user_agent",
    },
  },
  {
    tableName: "user_consents",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    underscored: true,
    indexes: [{ unique: true, fields: ["user_id", "consent_type"] }],
  }
);

User.hasMany(UserConsent, {
  as: "consents",
  foreignKey: "userId",
});
UserConsent.belongsTo(User, {
  as: "user",
  foreignKey: "userId",
});

export const SmsLog = sequelize.define(
  "SmsLog",
  {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
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
    providerMessageId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "provider_message_id",
    },
    costCents: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "cost_cents",
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "error_message",
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: "metadata",
    },
  },
  {
    tableName: "sms_logs",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    underscored: true,
  }
);

User.hasMany(SmsLog, {
  as: "smsLogs",
  foreignKey: "userId",
});
 SmsLog.belongsTo(User, {
   as: "user",
   foreignKey: "userId",
 });