import { createClient, createCluster } from "redis";

import { config } from "../config/index.js";

function withTimeout(promise, timeoutMs, timeoutMessage) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    }),
  ]);
}

function createBaseOptions(reconnectErrorMessage) {
  return {
    socket: {
      connectTimeout: config.redisConnectTimeoutMs,
      reconnectStrategy: () => new Error(reconnectErrorMessage),
    },
  };
}

function toStringValue(value) {
  if (Buffer.isBuffer(value)) return value.toString("utf8");
  return String(value ?? "");
}

function parseSentinelMasterReply(reply) {
  if (!Array.isArray(reply) || reply.length < 2) {
    throw new Error("Invalid sentinel response format");
  }

  const host = toStringValue(reply[0]).trim();
  const port = Number(toStringValue(reply[1]));
  if (!host || !Number.isInteger(port) || port <= 0) {
    throw new Error("Invalid sentinel master host/port");
  }

  return { host, port };
}

function buildAuthPart() {
  const username = String(config.redisUsername || "").trim();
  const password = String(config.redisPassword || "").trim();

  if (username) {
    if (password) {
      return `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`;
    }
    return `${encodeURIComponent(username)}@`;
  }

  if (password) {
    return `:${encodeURIComponent(password)}@`;
  }

  return "";
}

function buildRedisUrl(host, port) {
  const scheme = config.redisScheme === "rediss" ? "rediss" : "redis";
  const authPart = buildAuthPart();
  const db = Number.isInteger(config.redisDatabase) && config.redisDatabase >= 0 ? config.redisDatabase : 0;
  return `${scheme}://${authPart}${host}:${port}/${db}`;
}

async function connectClient(client, timeoutMs, timeoutMessage) {
  client.on("error", () => {});
  await withTimeout(client.connect(), timeoutMs, timeoutMessage);
}

function getClusterRootNodes() {
  return (Array.isArray(config.redisClusterNodes) ? config.redisClusterNodes : [])
    .map((url) => String(url || "").trim())
    .filter(Boolean)
    .map((url) => ({ url }));
}

function buildClusterDefaults(serviceName) {
  const defaults = createBaseOptions(`Redis reconnect disabled (${serviceName})`);
  const username = String(config.redisUsername || "").trim();
  const password = String(config.redisPassword || "").trim();
  const database = Number.isInteger(config.redisDatabase) && config.redisDatabase >= 0
    ? config.redisDatabase
    : 0;

  if (username) {
    defaults.username = username;
  }
  if (password) {
    defaults.password = password;
  }
  defaults.database = database;

  return defaults;
}

async function resolveMasterBySentinel(serviceName) {
  const sentinelUrls = Array.isArray(config.redisSentinelUrls) ? config.redisSentinelUrls : [];
  const masterName = String(config.redisSentinelMasterName || "").trim();
  const errors = [];

  if (!masterName) {
    throw new Error("REDIS_SENTINEL_MASTER_NAME is required for sentinel mode");
  }

  for (const sentinelUrl of sentinelUrls) {
    let sentinelClient = null;
    try {
      sentinelClient = createClient({
        ...createBaseOptions(`Redis sentinel reconnect disabled (${serviceName})`),
        url: sentinelUrl,
      });
      await connectClient(
        sentinelClient,
        config.redisConnectTimeoutMs,
        `Redis sentinel connect timeout (${serviceName})`
      );

      const reply = await withTimeout(
        sentinelClient.sendCommand(["SENTINEL", "get-master-addr-by-name", masterName]),
        config.redisConnectTimeoutMs,
        `Redis sentinel lookup timeout (${serviceName})`
      );
      const { host, port } = parseSentinelMasterReply(reply);
      return { host, port, sentinelUrl };
    } catch (error) {
      errors.push(`${sentinelUrl}: ${error?.message || "unknown sentinel error"}`);
    } finally {
      try {
        await sentinelClient?.quit();
      } catch {
        // ignore sentinel close errors
      }
    }
  }

  throw new Error(
    `Unable to resolve Redis master from sentinels (${serviceName}): ${errors.join("; ")}`
  );
}

export async function connectRedisClientForService(serviceName) {
  if (config.redisMode === "sentinel") {
    const resolved = await resolveMasterBySentinel(serviceName);
    const client = createClient({
      ...createBaseOptions(`Redis reconnect disabled (${serviceName})`),
      url: buildRedisUrl(resolved.host, resolved.port),
    });
    await connectClient(client, config.redisConnectTimeoutMs, `Redis connect timeout (${serviceName})`);

    return {
      client,
      driver: "redis-sentinel",
      mode: "sentinel",
      sentinelUrl: resolved.sentinelUrl,
      master: `${resolved.host}:${resolved.port}`,
    };
  }

  if (config.redisMode === "cluster") {
    const rootNodes = getClusterRootNodes();
    if (rootNodes.length === 0) {
      throw new Error("REDIS_CLUSTER_NODES is required for cluster mode");
    }

    const client = createCluster({
      rootNodes,
      defaults: buildClusterDefaults(serviceName),
    });
    await connectClient(client, config.redisConnectTimeoutMs, `Redis cluster connect timeout (${serviceName})`);

    return {
      client,
      driver: "redis-cluster",
      mode: "cluster",
      nodes: rootNodes.map((node) => node.url),
    };
  }

  const client = createClient({
    ...createBaseOptions(`Redis reconnect disabled (${serviceName})`),
    url: config.redisUrl,
  });
  await connectClient(client, config.redisConnectTimeoutMs, `Redis connect timeout (${serviceName})`);

  return {
    client,
    driver: "redis",
    mode: "single",
    endpoint: config.redisUrl,
  };
}
