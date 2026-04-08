const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const getProductRefId = (item) => {
  const rawId = isObject(item) ? item.id : item;
  const parsedId = Number(rawId);
  return Number.isFinite(parsedId) ? parsedId : null;
};

export const hydrateProductRefs = (items, previousItems = []) => {
  const sourceItems = Array.isArray(items) ? items : [];
  const prevItems = Array.isArray(previousItems) ? previousItems : [];

  const prevById = new Map();
  for (const item of prevItems) {
    const id = getProductRefId(item);
    if (id == null || !isObject(item)) continue;
    prevById.set(id, item);
  }

  const seen = new Set();
  const hydrated = [];

  for (const item of sourceItems) {
    const id = getProductRefId(item);
    if (id == null || seen.has(id)) continue;
    seen.add(id);

    const fromPrevious = prevById.get(id);
    const fromCurrent = isObject(item) ? item : null;

    if (!fromPrevious && !fromCurrent) {
      hydrated.push({ id });
      continue;
    }

    hydrated.push({
      ...(fromPrevious || {}),
      ...(fromCurrent || {}),
      id,
    });
  }

  return hydrated;
};
