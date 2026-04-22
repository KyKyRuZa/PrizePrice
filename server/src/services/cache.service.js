import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";
import { connectRedisClientForService } from "./redisClient.factory.js";

const CACHE_TTL_SECONDS = 600;
let redisClient = null;
let redisInfo = null;

const inMemoryCache = new Map();

function memoryGet(key) {
  return inMemoryCache.get(key);
}

function memorySet(key, value) {
  inMemoryCache.set(key, value);
}

function memoryDelete(key) {
  inMemoryCache.delete(key);
}

async function ensureRedisConnected() {
  if (redisClient) return true;
  try {
    redisInfo = await connectRedisClientForService("cache");
    redisClient = redisInfo.client;
    return true;
  } catch (error) {
    logger.warn("cache_redis_connect_failed", { message: error?.message });
    redisClient = null;
    redisInfo = null;
    return false;
  }
}

async function redisGet(key) {
  const connected = await ensureRedisConnected();
  if (!connected) return null;
  try {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.warn("cache_redis_get_failed", { message: error?.message, key });
    return null;
  }
}

async function redisSet(key, value, ttlSeconds = CACHE_TTL_SECONDS) {
  const connected = await ensureRedisConnected();
  if (!connected) {
    memorySet(key, value);
    return;
  }
  try {
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    logger.warn("cache_redis_set_failed", { message: error?.message, key });
    memorySet(key, value);
  }
}

async function redisDelete(key) {
  const connected = await ensureRedisConnected();
  if (!connected) {
    memoryDelete(key);
    return;
  }
  try {
    await redisClient.del(key);
  } catch (error) {
    logger.warn("cache_redis_del_failed", { message: error?.message, key });
  }
}

export async function getOrSet(key, fetchFn, ttlSeconds = CACHE_TTL_SECONDS) {
  const cached = await redisGet(key);
  if (cached !== null) return cached;

  const value = await fetchFn();
  await redisSet(key, value, ttlSeconds);
  return value;
}

export async function invalidate(key) {
  await redisDelete(key);
}

export { redisGet, redisSet };