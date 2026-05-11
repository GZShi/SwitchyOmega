import * as chai from "chai";
import Options from "../src/options";
import OmegaPac from "omega-pac";

chai.should();

describe("Options", () => {
  describe("static transformValueForSync", () => {
    it("passes non-profile keys through untouched", () => {
      const value = { foo: 1 };
      Options.transformValueForSync(value, "-someSetting").should.equal(value);
    });

    it("passes non-updateUrl profiles through untouched", () => {
      const value = { profileType: "FixedProfile", name: "proxy" };
      Options.transformValueForSync(value, "+proxy").should.equal(value);
    });

    it("strips lastUpdate/ruleList/pacScript for profiles with updateUrl", () => {
      const value = {
        profileType: "RuleListProfile",
        name: "rl",
        format: "Switchy",
        sourceUrl: "https://example.com/rules.txt",
        lastUpdate: "2024-01-01T00:00:00.000Z",
        ruleList: "...raw...",
        pacScript: "function FindProxyForURL(){}",
        color: "#123456",
      };
      const out = Options.transformValueForSync(value, "+rl");
      out.should.not.equal(value);
      Object.prototype.hasOwnProperty.call(out, "lastUpdate").should.equal(
        false,
      );
      Object.prototype.hasOwnProperty.call(out, "ruleList").should.equal(false);
      Object.prototype.hasOwnProperty.call(out, "pacScript").should.equal(
        false,
      );
      out.name.should.equal("rl");
      out.sourceUrl.should.equal("https://example.com/rules.txt");
      out.color.should.equal("#123456");
    });
  });

  describe("error classes", () => {
    it("ProfileNotExistError carries the profile name", () => {
      const err = new Options.ProfileNotExistError("ghost");
      err.should.be.instanceOf(Error);
      err.profileName.should.equal("ghost");
      err.message.should.contain("ghost");
    });

    it("NoOptionsError is an Error subclass", () => {
      new Options.NoOptionsError().should.be.instanceOf(Error);
    });
  });

  describe("#parseOptions", () => {
    const parse = (input: any) =>
      Options.prototype.parseOptions.call({} as any, input);

    it("returns the same object when given an object", () => {
      const obj = { schemaVersion: 2 };
      parse(obj).should.equal(obj);
    });

    it("parses a JSON string", () => {
      const result = parse('{"schemaVersion":2,"foo":"bar"}');
      result.should.eql({ schemaVersion: 2, foo: "bar" });
    });

    it("parses a base64-encoded JSON string", () => {
      const json = JSON.stringify({ schemaVersion: 2, foo: "baz" });
      const b64 = Buffer.from(json, "utf8").toString("base64");
      const result = parse(b64);
      result.should.eql({ schemaVersion: 2, foo: "baz" });
    });

    it("throws on malformed input", () => {
      (() => parse("not-json-or-base64")).should.throw();
    });
  });

  describe("#upgrade", () => {
    const upgrade = (opts: any, changes?: any) =>
      Options.prototype.upgrade.call({} as any, opts, changes);

    it("is a no-op for already-v2 options", async () => {
      const opts = { schemaVersion: 2, foo: "bar" };
      const [result, changes] = await upgrade(opts);
      result.should.equal(opts);
      changes.should.eql({});
    });

    it("migrates v1 options to v2 without injecting auto_detect when unused", async () => {
      const opts: any = {
        schemaVersion: 1,
        "+proxy": OmegaPac.Profiles.create({
          name: "proxy",
          profileType: "FixedProfile",
        }),
      };
      const [result, changes] = await upgrade(opts);
      result.schemaVersion.should.equal(2);
      changes.schemaVersion.should.equal(2);
      Object.prototype.hasOwnProperty.call(result, "+auto_detect").should.equal(
        false,
      );
    });

    it("injects +auto_detect when any profile references it", async () => {
      // A SwitchProfile that falls back to auto_detect triggers the migration path.
      const switchProfile: any = OmegaPac.Profiles.create({
        name: "auto switch",
        profileType: "SwitchProfile",
        defaultProfileName: "auto_detect",
      });
      switchProfile.rules = [];
      const opts: any = {
        schemaVersion: 1,
        "+auto switch": switchProfile,
      };
      const [result] = await upgrade(opts);
      result.schemaVersion.should.equal(2);
      result["+auto_detect"].should.exist;
      result["+auto_detect"].profileType.should.equal("PacProfile");
      result["+auto_detect"].pacUrl.should.equal("http://wpad/wpad.dat");
    });

    it("rejects unknown schemaVersion", () => {
      return upgrade({ schemaVersion: 99 })
        .then(() => Promise.reject(new Error("should have rejected")))
        .catch((e: any) => {
          e.should.be.instanceOf(Error);
          e.message.should.contain("schemaVersion");
        });
    });
  });

  describe("#_replaceRefChanges", () => {
    it("rewrites references in other profiles and in quickSwitch/startup", () => {
      const rl = OmegaPac.Profiles.create({
        name: "list",
        profileType: "SwitchProfile",
        defaultProfileName: "old",
      });
      rl.rules = [];
      const stub: any = {
        _options: {
          "+list": rl,
          "-startupProfileName": "old",
          "-quickSwitchProfiles": ["direct", "old"],
        },
      };
      const changes = Options.prototype._replaceRefChanges.call(
        stub,
        "old",
        "new",
      );
      changes["-startupProfileName"].should.equal("new");
      changes["-quickSwitchProfiles"].should.eql(["direct", "new"]);
      changes["+list"].defaultProfileName.should.equal("new");
    });
  });
});
