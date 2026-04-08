import { describe, expect, it } from "vitest";
import { getProductRefId, hydrateProductRefs } from "./productHydration";

describe("productHydration", () => {
  it("extracts product id from number and object refs", () => {
    expect(getProductRefId(42)).toBe(42);
    expect(getProductRefId({ id: "7" })).toBe(7);
    expect(getProductRefId({})).toBeNull();
    expect(getProductRefId("abc")).toBeNull();
  });

  it("hydrates numeric refs to id stubs when no payload exists", () => {
    const hydrated = hydrateProductRefs([1]);
    expect(hydrated).toHaveLength(1);
    expect(hydrated[0]).toMatchObject({
      id: 1,
    });
    expect(Object.keys(hydrated[0])).toEqual(["id"]);
  });

  it("preserves local object fields while merging with ids", () => {
    const previous = [{ id: 1, addedAt: "2026-02-21T00:00:00.000Z" }];
    const hydrated = hydrateProductRefs([1], previous);
    expect(hydrated).toHaveLength(1);
    expect(hydrated[0].id).toBe(1);
    expect(hydrated[0].addedAt).toBe("2026-02-21T00:00:00.000Z");
    expect(hydrated[0]).toMatchObject({
      id: 1,
      addedAt: "2026-02-21T00:00:00.000Z",
    });
  });
});
