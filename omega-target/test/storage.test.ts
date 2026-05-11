import * as chai from "chai";
import Storage from "../src/storage";

chai.should();

describe("Storage", () => {
  describe(".operationsForChanges", () => {
    it("returns set when no base is provided", () => {
      const { set, remove } = Storage.operationsForChanges({ a: 1, b: 2 });
      set.should.eql({ a: 1, b: 2 });
      remove.should.eql([]);
    });

    it("returns remove for undefined values when no base is provided", () => {
      const { set, remove } = Storage.operationsForChanges({
        a: undefined,
        b: 2,
      });
      set.should.eql({ b: 2 });
      remove.should.eql(["a"]);
    });

    it("skips unchanged values when base is provided", () => {
      const { set, remove } = Storage.operationsForChanges(
        { a: 1, b: 2 },
        { base: { a: 1, b: 1 } },
      );
      set.should.eql({ b: 2 });
      remove.should.eql([]);
    });

    it("only records remove when the key exists in base", () => {
      const { set, remove } = Storage.operationsForChanges(
        { a: undefined, b: undefined },
        { base: { a: 1 } },
      );
      set.should.eql({});
      remove.should.eql(["a"]);
    });

    it("applies merge hook to decide final value", () => {
      const merge = (_key: string, newVal: any, oldVal: any) =>
        oldVal != null && oldVal.locked ? oldVal : newVal;
      const { set, remove } = Storage.operationsForChanges(
        { a: { v: 2 }, b: { v: 2 } },
        { base: { a: { v: 1, locked: true }, b: { v: 1 } }, merge },
      );
      set.should.eql({ b: { v: 2 } });
      remove.should.eql([]);
    });
  });

  describe("#get/#set/#remove/#apply", () => {
    it("returns empty object when storage has no items", async () => {
      const s = new Storage();
      const got = await s.get(null);
      got.should.eql({});
    });

    it("returns defaults for missing keys when keys is an object", async () => {
      const s = new Storage();
      await s.set({ a: 1 });
      const got = await s.get({ a: 0, b: 7 });
      got.should.eql({ a: 1, b: 7 });
    });

    it("returns the requested key when keys is a string", async () => {
      const s = new Storage();
      await s.set({ a: 1 });
      const got = await s.get("a");
      got.should.eql({ a: 1 });
    });

    it("returns requested keys when keys is an array", async () => {
      const s = new Storage();
      await s.set({ a: 1, b: 2 });
      const got = await s.get(["a", "c"]);
      Object.prototype.hasOwnProperty.call(got, "a").should.equal(true);
      Object.prototype.hasOwnProperty.call(got, "c").should.equal(true);
      (got.a as number).should.equal(1);
      (got.c === undefined).should.equal(true);
    });

    it("clears all items when remove is called with null", async () => {
      const s = new Storage();
      await s.set({ a: 1, b: 2 });
      await s.remove(null);
      const got = await s.get(null);
      got.should.eql({});
    });

    it("removes a list of keys", async () => {
      const s = new Storage();
      await s.set({ a: 1, b: 2, c: 3 });
      await s.remove(["a", "b"]);
      const got = await s.get(null);
      got.should.eql({ c: 3 });
    });

    it("apply translates changes into set + remove", async () => {
      const s = new Storage();
      await s.set({ a: 1 });
      await s.apply({ changes: { a: undefined, b: 2 } });
      const got = await s.get(null);
      got.should.eql({ b: 2 });
    });

    it("apply accepts pre-computed set/remove operations", async () => {
      const s = new Storage();
      await s.set({ a: 1, b: 2 });
      await s.apply({ set: { c: 3 }, remove: ["a"] });
      const got = await s.get(null);
      got.should.eql({ b: 2, c: 3 });
    });
  });

  describe("error classes", () => {
    it("exposes RateLimitExceededError/QuotaExceededError/StorageUnavailableError", () => {
      new Storage.RateLimitExceededError().should.be.instanceOf(Error);
      new Storage.QuotaExceededError().should.be.instanceOf(Error);
      new Storage.StorageUnavailableError().should.be.instanceOf(Error);
    });
  });
});
