import { okResponseSchema, userDataPayloadSchema } from '../contracts/apiSchemas';
import { apiGet, apiPost } from './apiClient';

/**
 * Centralized user data synchronization utility
 * Manages synchronization between local storage and server for all user data types
 */

const STORAGE_KEYS = {
  FAVORITES: 'prizeprice_favorites',
  CART: 'prizeprice_cart',
  SEARCH_HISTORY: 'prizeprice_search_history',
  BROWSING_HISTORY: 'prizeprice_browsing_history',
  PRICE_WATCH: 'prizeprice_price_watch',
};

const pickFieldOrSelf = (field) => (item) => (typeof item === 'object' ? item?.[field] : item);

const DATA_CHANNELS = [
  {
    field: 'favorites',
    storageKey: STORAGE_KEYS.FAVORITES,
    getId: pickFieldOrSelf('id'),
    toPayload: pickFieldOrSelf('id'),
  },
  {
    field: 'cart',
    storageKey: STORAGE_KEYS.CART,
    getId: pickFieldOrSelf('id'),
    toPayload: pickFieldOrSelf('id'),
  },
  {
    field: 'searchHistory',
    storageKey: STORAGE_KEYS.SEARCH_HISTORY,
    getId: pickFieldOrSelf('query'),
    toPayload: pickFieldOrSelf('query'),
  },
  {
    field: 'browsingHistory',
    storageKey: STORAGE_KEYS.BROWSING_HISTORY,
    getId: pickFieldOrSelf('productId'),
    toPayload: pickFieldOrSelf('productId'),
  },
  {
    field: 'priceWatch',
    storageKey: STORAGE_KEYS.PRICE_WATCH,
    getId: (item) => Number(item?.watch?.productId ?? item?.productId),
    toPayload: (item) => {
      const productId = Number(item?.watch?.productId ?? item?.productId);
      return {
        productId,
        targetPrice: item?.watch?.targetPrice ?? item?.targetPrice ?? null,
        dropPercent: item?.watch?.dropPercent ?? item?.dropPercent ?? null,
        active: item?.watch?.active ?? item?.active ?? true,
      };
    },
  },
];

const safeParse = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const readLocalSnapshot = () =>
  DATA_CHANNELS.reduce((snapshot, channel) => {
    snapshot[channel.field] = asArray(safeParse(localStorage.getItem(channel.storageKey), []));
    return snapshot;
  }, {});

const writeLocalSnapshot = (snapshot) => {
  for (const channel of DATA_CHANNELS) {
    localStorage.setItem(channel.storageKey, JSON.stringify(asArray(snapshot[channel.field])));
  }
};

const buildUploadPayload = (snapshot) =>
  DATA_CHANNELS.reduce((payload, channel) => {
    payload[channel.field] = asArray(snapshot[channel.field]).map(channel.toPayload);
    return payload;
  }, {});

const mergeSnapshotWithServerData = (localSnapshot, serverData) =>
  DATA_CHANNELS.reduce((snapshot, channel) => {
    snapshot[channel.field] = mergeData(
      asArray(localSnapshot[channel.field]),
      asArray(serverData?.[channel.field]),
      channel.getId
    );
    return snapshot;
  }, {});

const getServerUserData = async () => apiGet('/auth/user-data', { schema: userDataPayloadSchema });

const runSyncOperation = async (errorMessage, operation) => {
  try {
    return await operation();
  } catch (error) {
    console.error(errorMessage, error);
    throw error;
  }
};

/**
 * Merge local and server data with conflict resolution
 */
const mergeData = (localData, serverData, getId) => {
  if (!Array.isArray(localData) || !Array.isArray(serverData)) {
    return serverData || localData || [];
  }

  const isObject = (item) => Boolean(item) && typeof item === 'object' && !Array.isArray(item);
  const byId = new Map();
  const orderedIds = [];

  const upsert = (item, source) => {
    const id = getId(item);
    if (id == null) return;

    if (!byId.has(id)) {
      byId.set(id, item);
      orderedIds.push(id);
      return;
    }

    const existing = byId.get(id);

    // Keep richer local object when server stores only primitive refs (ids).
    if (source === 'local' && isObject(item) && !isObject(existing)) {
      byId.set(id, item);
      return;
    }

    // For two objects keep server fields authoritative, but preserve local extras.
    if (source === 'server' && isObject(item) && isObject(existing)) {
      byId.set(id, { ...existing, ...item });
      return;
    }

    // Default server precedence for equal-shape conflicts.
    if (source === 'server') {
      byId.set(id, item);
    }
  };

  for (const item of serverData) upsert(item, 'server');
  for (const item of localData) upsert(item, 'local');

  return orderedIds.map((id) => byId.get(id));
};

/**
 * Synchronize all user data with the server
 */
export const syncAllUserData = async () => {
  return runSyncOperation('Error synchronizing user data:', async () => {
    const localSnapshot = readLocalSnapshot();
    const serverData = await getServerUserData();

    const mergedSnapshot = mergeSnapshotWithServerData(localSnapshot, serverData);
    writeLocalSnapshot(mergedSnapshot);

    await apiPost('/auth/user-data', buildUploadPayload(mergedSnapshot), {
      schema: okResponseSchema,
    });

    return mergedSnapshot;
  });
};

/**
 * Upload local changes to server
 */
export const uploadLocalChanges = async () => {
  return runSyncOperation('Error uploading local changes:', async () => {
    const localSnapshot = readLocalSnapshot();

    await apiPost('/auth/user-data', buildUploadPayload(localSnapshot), {
      schema: okResponseSchema,
    });
  });
};

/**
 * Download server data and merge with local data
 */
export const downloadAndMergeServerData = async () => {
  return runSyncOperation('Error downloading and merging server data:', async () => {
    const serverData = await getServerUserData();
    const localSnapshot = readLocalSnapshot();

    const mergedSnapshot = mergeSnapshotWithServerData(localSnapshot, serverData);
    writeLocalSnapshot(mergedSnapshot);

    return mergedSnapshot;
  });
};

/**
 * Initialize local storage with server data if authenticated
 */
export const initializeLocalData = async () => {
  return runSyncOperation('Error initializing local data:', async () => {
    const serverData = await getServerUserData();

    for (const channel of DATA_CHANNELS) {
      if (!localStorage.getItem(channel.storageKey)) {
        localStorage.setItem(channel.storageKey, JSON.stringify(asArray(serverData?.[channel.field])));
      }
    }
  });
};

/**
 * Clear all local user data
 */
export const clearLocalUserData = () => {
  for (const channel of DATA_CHANNELS) {
    localStorage.removeItem(channel.storageKey);
  }
};
