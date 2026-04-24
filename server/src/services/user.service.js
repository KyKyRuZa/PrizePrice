import SequelizePkg from "sequelize";

import { BrowsingHistory, CartItem, Favorite, SearchHistory, User, sequelize } from "../models/index.js";
import { sanitizeSearchQuery } from "../utils/sanitize.js";
import { logger } from "../utils/logger.js";

const { Op } = SequelizePkg;
const HISTORY_LIMIT = 50;

function toAuthSummary(user) {
  return {
    id: user.id,
    phone: user.phone,
    email: user.email,
    name: user.name,
    hasPassword: Boolean(user.passwordHash),
  };
}

function toPublicUser(user) {
  return {
    id: user.id,
    phone: user.phone,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
    hasPassword: Boolean(user.passwordHash),
    passwordUpdatedAt: user.passwordUpdatedAt ?? null,
    sms_opt_out: user.smsOptOut,
  };
}

function toUserWithPassword(user) {
  return {
    id: user.id,
    phone: user.phone,
    email: user.email,
    name: user.name,
    passwordHash: user.passwordHash,
    createdAt: user.createdAt,
    passwordUpdatedAt: user.passwordUpdatedAt,
  };
}

async function listProductIds(model, userId, { limit, offset } = {}) {
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 50));
  const offsetNum = Math.max(0, Number(offset) || 0);

  const rows = await model.findAll({
    where: { userId },
    attributes: ["productId"],
    order: [["createdAt", "DESC"]],
    limit: limitNum,
    offset: offsetNum,
    raw: true,
  });
  return rows.map((row) => row.productId);
}

async function countProductIds(model, userId) {
  const count = await model.count({ where: { userId } });
  return count;
}

async function addProductToCollection(model, userId, productId) {
  await model.findOrCreate({
    where: { userId, productId },
    defaults: { userId, productId },
  });
}

async function removeProductFromCollection(model, userId, productId) {
  await model.destroy({ where: { userId, productId } });
}

async function clearProductCollection(model, userId) {
  await model.destroy({ where: { userId } });
}

async function trimRowsByLatest(model, userId, timeColumn, limit = HISTORY_LIMIT) {
  const excess = await model.findAll({
    where: { userId },
    attributes: ["id"],
    order: [[timeColumn, "DESC"]],
    offset: limit,
    raw: true,
  });

  if (!excess.length) {
    return;
  }

  await model.destroy({
    where: {
      userId,
      id: { [Op.in]: excess.map((row) => row.id) },
    },
  });
}

export async function findOrCreateUserByPhone(phone, email = null, name = null) {
  const [user] = await User.findOrCreate({
    where: { phone },
    defaults: { phone, email: email || null, name: name || null },
  });
  return toAuthSummary(user);
}

export async function findOrCreateUserByEmail(email, phone = null, name = null) {
  const [user] = await User.findOrCreate({
    where: { email },
    defaults: { phone: phone || null, email, name: name || null },
  });
  return toAuthSummary(user);
}

export async function getUserById(id) {
  const user = await User.findByPk(id);
  if (!user) return null;
  return toPublicUser(user);
}

export async function getUserByEmail(email) {
  const user = await User.findOne({ where: { email } });
  if (!user) return null;
  return toUserWithPassword(user);
}

export async function updateUserName(userId, name) {
  const user = await User.findByPk(userId);
  if (!user) return null;

  await user.update({ name });
  return toPublicUser(user);
}

export async function getUserByPhone(phone) {
  return User.findOne({ where: { phone } });
}

export async function getUserByUsername(username) {
  return User.findOne({ where: { name: username } });
}

export async function setUserPassword(userId, passwordHash) {
  await User.update(
    { passwordHash, passwordUpdatedAt: new Date() },
    { where: { id: userId } }
  );
}

export async function addSearchHistory(userId, query) {
  const q = sanitizeSearchQuery(query, 120);
  if (!q) return;

  try {
    await sequelize.query(
      `
        INSERT INTO search_history (user_id, query, created_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (user_id, lower(query))
        DO UPDATE SET
          query = EXCLUDED.query,
          created_at = EXCLUDED.created_at
      `,
      { bind: [userId, q] }
    );
  } catch (error) {
    logger.warn("search_history_upsert_fallback", { message: error?.message });

    await SearchHistory.destroy({
      where: {
        userId,
        query: { [Op.iLike]: q },
      },
    });

    await SearchHistory.create({ userId, query: q });
  }

  await trimRowsByLatest(SearchHistory, userId, "createdAt");
}

export async function getSearchHistory(userId) {
  const rows = await SearchHistory.findAll({
    where: { userId },
    attributes: ["id", "query", "createdAt"],
    order: [["createdAt", "DESC"]],
    limit: HISTORY_LIMIT,
    raw: true,
  });
  return rows.map((row) => ({ id: row.id, query: row.query, created_at: row.createdAt }));
}

export async function deleteHistoryItem(userId, historyId) {
  await SearchHistory.destroy({ where: { userId, id: historyId } });
}

export async function clearSearchHistory(userId) {
  await SearchHistory.destroy({ where: { userId } });
}

export async function listFavorites(userId, { limit, offset } = {}) {
  const ids = await listProductIds(Favorite, userId, { limit, offset });
  const total = await countProductIds(Favorite, userId);
  return { ids, total };
}

export async function addFavorite(userId, productId) {
  await addProductToCollection(Favorite, userId, productId);
}

export async function removeFavorite(userId, productId) {
  await removeProductFromCollection(Favorite, userId, productId);
}

export async function clearFavorites(userId) {
  await clearProductCollection(Favorite, userId);
}

export async function listCart(userId, { limit, offset } = {}) {
  const ids = await listProductIds(CartItem, userId, { limit, offset });
  const total = await countProductIds(CartItem, userId);
  return { ids, total };
}

export async function addToCart(userId, productId) {
  await addProductToCollection(CartItem, userId, productId);
}

export async function removeFromCart(userId, productId) {
  await removeProductFromCollection(CartItem, userId, productId);
}

export async function clearCart(userId) {
  await clearProductCollection(CartItem, userId);
}

export async function addBrowsingHistory(userId, productId) {
  await BrowsingHistory.create({ userId, productId });
  await trimRowsByLatest(BrowsingHistory, userId, "viewedAt");
}

export async function getBrowsingHistory(userId) {
  const rows = await BrowsingHistory.findAll({
    where: { userId },
    attributes: ["id", "productId", "viewedAt"],
    order: [["viewedAt", "DESC"]],
    limit: HISTORY_LIMIT,
    raw: true,
  });

  return rows.map((row) => ({
    id: row.id,
    productId: row.productId,
    viewed_at: row.viewedAt,
  }));
}

export async function clearBrowsingHistory(userId) {
  await BrowsingHistory.destroy({ where: { userId } });
}
