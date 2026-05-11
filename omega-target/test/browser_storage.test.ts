import * as chai from "chai";
import BrowserStorage from "../src/browser_storage";

chai.should();

describe("BrowserStorage", () => {
  const createFakeStorage = () => {
    const items = new Map<string, string>();
    class FakeStorage {
      get length() {
        return items.size;
      }
      getItem(key: string) {
        return items.has(key) ? items.get(key)! : null;
      }
      setItem(key: string, value: string) {
        items.set(key, value);
      }
      removeItem(key: string) {
        items.delete(key);
      }
      clear() {
        items.clear();
      }
      key(i: number) {
        return Array.from(items.keys())[i] ?? null;
      }
    }
    return { storage: new FakeStorage() as any, items };
  };

  it("round-trips JSON values via setItem/getItem", async () => {
    const { storage, items } = createFakeStorage();
    const bs = new BrowserStorage(storage);
    await bs.set({ a: 1, b: { nested: true } });
    items.get("a")!.should.equal("1");
    items.get("b")!.should.equal(JSON.stringify({ nested: true }));
    const got = await bs.get(["a", "b"]);
    got.should.eql({ a: 1, b: { nested: true } });
  });

  it("honors the configured key prefix", async () => {
    const { storage, items } = createFakeStorage();
    const bs = new BrowserStorage(storage, "omega:");
    await bs.set({ a: 1 });
    items.has("omega:a").should.equal(true);
    items.has("a").should.equal(false);
    const got = await bs.get("a");
    got.should.eql({ a: 1 });
  });

  it("returns only prefixed keys when fetching all", async () => {
    const { storage } = createFakeStorage();
    const bs = new BrowserStorage(storage, "omega:");
    await bs.set({ a: 1, b: 2 });
    // Write a foreign key directly to the underlying store
    storage.setItem("other:c", JSON.stringify(3));
    const got = await bs.get(null);
    got.should.eql({ a: 1, b: 2 });
  });

  it("applies defaults when the key is missing in object form", async () => {
    const { storage } = createFakeStorage();
    const bs = new BrowserStorage(storage);
    await bs.set({ a: 1 });
    const got = await bs.get({ a: 0, b: "fallback" });
    got.should.eql({ a: 1, b: "fallback" });
  });

  it("ignores JSON parse failures without throwing", async () => {
    const { storage } = createFakeStorage();
    storage.setItem("a", "{not-json");
    const bs = new BrowserStorage(storage);
    const got = await bs.get("a");
    got.should.eql({});
  });

  it("removes only prefixed keys when clearing all", async () => {
    const { storage, items } = createFakeStorage();
    const bs = new BrowserStorage(storage, "omega:");
    await bs.set({ a: 1, b: 2 });
    storage.setItem("other:c", JSON.stringify(3));
    await bs.remove(null);
    items.has("omega:a").should.equal(false);
    items.has("omega:b").should.equal(false);
    items.has("other:c").should.equal(true);
  });

  it("clears the entire store when prefix is empty", async () => {
    const { storage, items } = createFakeStorage();
    const bs = new BrowserStorage(storage);
    await bs.set({ a: 1, b: 2 });
    storage.setItem("c", JSON.stringify(3));
    await bs.remove(null);
    items.size.should.equal(0);
  });

  it("removes a single key or a list", async () => {
    const { storage, items } = createFakeStorage();
    const bs = new BrowserStorage(storage, "omega:");
    await bs.set({ a: 1, b: 2, c: 3 });
    await bs.remove("a");
    items.has("omega:a").should.equal(false);
    await bs.remove(["b", "c"]);
    items.size.should.equal(0);
  });
});
