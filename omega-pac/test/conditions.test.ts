import * as chai from "chai";
import * as FakeTimers from "@sinonjs/fake-timers";
import * as Conditions from "../src/conditions";
import * as b from "../src/astree/builders";

const should = chai.should();

describe("Conditions", () => {
  const testCond = (condition: any, request: any, should_match: any) => {
    const o_request = request;
    should_match = !!should_match;
    if (typeof request === "string") {
      request = Conditions.requestFromUrl(request);
    }

    const matchResult = Conditions.match(condition, request);
    const condExpr = Conditions.compile(condition);
    const testFunc = b.func(
      [b.id("url"), b.id("host"), b.id("scheme")],
      b.block([b.ret(condExpr)]),
    );
    let compiledFunc = eval("(" + testFunc.print_to_string() + ")");
    const compileResult = compiledFunc(
      request.url,
      request.host,
      request.scheme,
    );

    const friendlyError = (compiled: any) => {
      const printCond = JSON.stringify(condition);
      const printCompiled = compiled ? "COMPILED " : "";
      const printMatch = should_match ? "to match" : "not to match";
      const msg =
        "expect " +
        printCompiled +
        "condition " +
        printCond +
        " " +
        printMatch +
        " request " +
        o_request;
      chai.assert(false, msg);
    };

    if (matchResult !== should_match) {
      friendlyError(false);
    }

    if (compileResult !== should_match) {
      friendlyError("compiled");
    }

    return matchResult;
  };

  describe("TrueCondition", () => {
    it("should always return true", () => {
      testCond({ conditionType: "TrueCondition" }, {}, "match");
    });
  });

  describe("FalseCondition", () => {
    it("should always return false", () => {
      testCond({ conditionType: "FalseCondition" }, {}, false);
    });
  });

  describe("UrlRegexCondition", () => {
    const cond: any = {
      conditionType: "UrlRegexCondition",
      pattern: "example\\.com",
    };
    it("should match requests based on regex pattern", () => {
      testCond(cond, "http://www.example.com/", "match");
    });
    it("should not match requests not matching the pattern", () => {
      testCond(cond, "http://www.example.net/", false);
    });
    it("should support regex meta chars", () => {
      const con: any = {
        conditionType: "UrlRegexCondition",
        pattern: "exam.*\\.com",
      };
      testCond(con, "http://www.example.com/", "match");
    });
    it("should fallback to not match if pattern is invalid", () => {
      const con: any = {
        conditionType: "UrlRegexCondition",
        pattern: ")Invalid(",
      };
      testCond(con, "http://www.example.com/", false);
    });
  });

  describe("UrlWildcardCondition", () => {
    const cond: any = {
      conditionType: "UrlWildcardCondition",
      pattern: "*example.com*",
    };
    it("should match requests based on wildcard pattern", () => {
      testCond(cond, "http://www.example.com/", "match");
    });
    it("should not match requests not matching the pattern", () => {
      testCond(cond, "http://www.example.net/", false);
    });
    it("should support wildcard question marks", () => {
      const con: any = {
        conditionType: "UrlWildcardCondition",
        pattern: "*exam???.com*",
      };
      testCond(con, "http://www.example.com/", "match");
    });
    it("should not support regex meta chars", () => {
      const con: any = {
        conditionType: "UrlWildcardCondition",
        pattern: ".*example.com.*",
      };
      testCond(con, "http://example.com/", false);
    });
    it("should support multiple patterns in one condition", () => {
      const con: any = {
        conditionType: "UrlWildcardCondition",
        pattern: "*.example.com/*|*.example.net/*",
      };
      testCond(con, "http://a.example.com/abc", "match");
      testCond(con, "http://b.example.net/def", "match");
      testCond(con, "http://c.example.org/ghi", false);
    });
  });

  describe("HostRegexCondition", () => {
    const cond: any = {
      conditionType: "HostRegexCondition",
      pattern: ".*\\.example\\.com",
    };
    it("should match requests based on regex pattern", () => {
      testCond(cond, "http://www.example.com/", "match");
    });
    it("should not match requests not matching the pattern", () => {
      testCond(cond, "http://example.com/", false);
    });
    it("should not match URL parts other than the host", () => {
      testCond(cond, "http://example.net/www.example.com").should.be.false;
    });
  });

  describe("HostWildcardCondition", () => {
    const cond: any = {
      conditionType: "HostWildcardCondition",
      pattern: "*.example.com",
    };
    it("should match requests based on wildcard pattern", () => {
      testCond(cond, "http://www.example.com/", "match");
    });
    it("should also match hostname without the optional level", () => {
      testCond(cond, "http://example.com/", "match");
    });
    it("should process patterns like *.*example.com correctly", () => {
      const con: any = {
        conditionType: "HostWildcardCondition",
        pattern: "*.*example.com",
      };
      testCond(con, "http://example.com/", "match");
      testCond(con, "http://www.example.com/", "match");
      testCond(con, "http://www.some-example.com/", "match");
      testCond(con, "http://xample.com/", false);
    });
    it("should allow override of the magical behavior", () => {
      const con: any = {
        conditionType: "HostWildcardCondition",
        pattern: "**.example.com",
      };
      testCond(con, "http://www.example.com/", "match");
      testCond(con, "http://example.com/", false);
    });
    it("should not match URL parts other than the host", () => {
      testCond(cond, "http://example.net/www.example.com").should.be.false;
    });
    it("should support multiple patterns in one condition", () => {
      const con: any = {
        conditionType: "HostWildcardCondition",
        pattern: "*.example.com|*.example.net",
      };
      testCond(con, "http://a.example.com/abc", "match");
      testCond(con, "http://example.net/def", "match");
      testCond(con, "http://c.example.org/ghi", false);
    });
  });

  describe("BypassCondition", () => {
    it("should correctly support patterns containing hosts", () => {
      const cond: any = {
        conditionType: "BypassCondition",
        pattern: ".example.com",
      };
      testCond(cond, "http://www.example.com/", "match");
      testCond(cond, "http://example.com/", false);
      cond.pattern = "*.example.com";
      testCond(cond, "http://www.example.com/", "match");
      testCond(cond, "http://example.com/", false);
      cond.pattern = "example.com";
      testCond(cond, "http://example.com/", "match");
      testCond(cond, "http://www.example.com/", false);
      cond.pattern = "*example.com";
      testCond(cond, "http://example.com/", "match");
      testCond(cond, "http://www.example.com/", "match");
      testCond(cond, "http://anotherexample.com/", "match");
    });
    it("should match the scheme specified in the pattern", () => {
      const cond: any = {
        conditionType: "BypassCondition",
        pattern: "http://example.com",
      };
      testCond(cond, "http://example.com/", "match");
      testCond(cond, "https://example.com/", false);
    });
    it("should match the port specified in the pattern", () => {
      const cond: any = {
        conditionType: "BypassCondition",
        pattern: "http://example.com:8080",
      };
      testCond(cond, "http://example.com:8080/", "match");
      testCond(cond, "http://example.com:888/", false);
    });
    it("should correctly support patterns using IPv4 literals", () => {
      const cond: any = {
        conditionType: "BypassCondition",
        pattern: "http://127.0.0.1:8080",
      };
      testCond(cond, "http://127.0.0.1:8080/", "match");
      testCond(cond, "http://127.0.0.2:8080/", false);
    });
    it("should correctly support IPv6 canonicalization", () => {
      const cond: any = {
        conditionType: "BypassCondition",
        pattern: "http://[0:0::1]:8080",
      };
      Conditions.analyze(cond);
      testCond(cond, "http://[::1]:8080/", "match");
      testCond(cond, "http://[1::1]:8080/", false);
    });
    it("should correctly support IPv6 canonicalization 2", () => {
      const cond: any = {
        conditionType: "BypassCondition",
        pattern: "[::1]",
      };
      Conditions.analyze(cond);
      testCond(cond, "http://[::1]:8080/", "match");
      testCond(cond, "http://[1::1]:8080/", false);
    });

    it("should parse IPv4 CIDR notation", () => {
      const cond: any = {
        conditionType: "BypassCondition",
        pattern: "192.168.0.0/16",
      };
      const result = Conditions.analyze(cond).analyzed;
      should.exist(result.ip);
      result.ip.should.eql({
        conditionType: "IpCondition",
        ip: "192.168.0.0",
        prefixLength: 16,
      });
    });

    it("should parse IPv6 CIDR notation", () => {
      const cond: any = {
        conditionType: "BypassCondition",
        pattern: "fefe:13::abc/33",
      };
      const result = Conditions.analyze(cond).analyzed;
      should.exist(result.ip);
      result.ip.should.eql({
        conditionType: "IpCondition",
        ip: "fefe:13::abc",
        prefixLength: 33,
      });
    });

    it("should parse IPv6 CIDR notation with zero prefixLength", () => {
      const cond: any = {
        conditionType: "BypassCondition",
        pattern: "::/0",
      };
      const result = Conditions.analyze(cond).analyzed;
      should.exist(result.ip);
      result.ip.should.eql({
        conditionType: "IpCondition",
        ip: "::",
        prefixLength: 0,
      });
    });

    it("should match 127.0.0.1 when <local> is used", () => {
      const cond: any = {
        conditionType: "BypassCondition",
        pattern: "<local>",
      };
      testCond(cond, "http://127.0.0.1:8080/", "match");
    });

    it("should match [::1] when <local> is used", () => {
      const cond: any = {
        conditionType: "BypassCondition",
        pattern: "<local>",
      };
      testCond(cond, "http://[::1]:8080/", "match");
    });

    it("should match any host without dots when <local> is used", () => {
      const cond: any = {
        conditionType: "BypassCondition",
        pattern: "<local>",
      };
      testCond(cond, "http://localhost:8080/", "match");
      testCond(cond, "http://intranet:8080/", "match");
      testCond(cond, "http://foobar/", "match");
      testCond(cond, "http://example.com/", false);
      testCond(cond, "http://[::ffff:eeee]/", "match");
      testCond(cond, "http://[::1.2.3.4]/", false);
    });
  });

  describe("IpCondition", () => {
    it("should support IPv4 subnet", () => {
      const cond: any = {
        conditionType: "IpCondition",
        ip: "192.168.1.1",
        prefixLength: 16,
      };
      const request = Conditions.requestFromUrl("http://192.168.4.4/");
      Conditions.match(cond, request).should.be.true;
      const compiled = Conditions.compile(cond).print_to_string();
      compiled.should.contain('isInNet(host,"192.168.1.1","255.255.0.0")');
    });
    it("should support IPv6 subnet", () => {
      const cond: any = {
        conditionType: "IpCondition",
        ip: "fefe:13::abc",
        prefixLength: 33,
      };
      const request = Conditions.requestFromUrl("http://[fefe:13::def]/");
      Conditions.match(cond, request).should.be.true;
      const compiled = Conditions.compile(cond).print_to_string();
      compiled.should.contain(
        'isInNet(host,"fefe:13::abc","ffff:ffff:8000::")',
      );
      compiled.should.contain('isInNetEx(host,"fefe:13::abc/33")');
    });
    it("should support IPv6 subnet with zero prefixLength", () => {
      const cond: any = {
        conditionType: "IpCondition",
        ip: "::",
        prefixLength: 0,
      };
      const request = Conditions.requestFromUrl("http://[fefe:13::def]/");
      Conditions.match(cond, request).should.be.true;
      const compiled = Conditions.compile(cond).print_to_string();
      compiled.indexOf("indexOf(").should.be.above(0);
    });
    it("should not match domain name to IP subnet", () => {
      const cond: any = {
        conditionType: "IpCondition",
        ip: "::",
        prefixLength: 0,
      };
      const request = Conditions.requestFromUrl("http://www.example.com/");
      Conditions.match(cond, request).should.be.false;
    });
    it("should not pass domain name to isInNet function", () => {
      const ipToCompiledFunc = (ip: string, prefixLen: number) => {
        const cond: any = {
          conditionType: "IpCondition",
          ip: ip,
          prefixLength: prefixLen,
        };
        const dummyIsInNet = b.func([], b.block([b.ret(b.bo(true))]));
        const testFunc = b.func(
          [b.id("url"), b.id("host"), b.id("scheme")],
          b.block([
            b.var_decl([b.vardef(b.id("isInNet"), dummyIsInNet)]),
            b.ret(Conditions.compile(cond)),
          ]),
        );
        return eval("(" + testFunc.print_to_string() + ")");
      };

      let compiledFunc = ipToCompiledFunc("0.0.0.0", 0);
      compiledFunc(null, "www.example.com").should.equal(false);
      compiledFunc(null, "127.0.0.1").should.equal(true);

      compiledFunc = ipToCompiledFunc("0.0.0.0", 1);
      compiledFunc(null, "www.example.com").should.equal(false);
      compiledFunc(null, "127.0.0.1").should.equal(true);

      compiledFunc = ipToCompiledFunc("::", 0);
      compiledFunc(null, "www.example.com").should.equal(false);
      compiledFunc(null, "::1").should.equal(true);

      compiledFunc = ipToCompiledFunc("::", 1);
      compiledFunc(null, "www.example.com").should.equal(false);
      compiledFunc(null, "::1").should.equal(true);
    });
  });

  describe("KeywordCondition", () => {
    const cond: any = {
      conditionType: "KeywordCondition",
      pattern: "example.com",
    };
    it("should match requests based on substring", () => {
      testCond(cond, "http://www.example.com/", "match");
      testCond(cond, "http://www.example.net/", false);
    });
    it("should not match HTTPS requests", () => {
      testCond(cond, "https://example.com/", false);
      testCond(cond, "https://example.net/", false);
    });
  });

  describe("WeekdayCondition", () => {
    let clock: any = null;
    before(() => {
      clock = FakeTimers.install({ now: 0, toFake: ["Date"] });
    });
    after(() => {
      clock.uninstall();
    });

    const testCondDay = (cond: any, day: number, match: any) => {
      const date = day > 0 ? day : 7;
      clock.setSystemTime(new Date(`2016-02-0${date}T00:00:00Z`).getTime());
      testCond(cond, `http://weekday-${day}/`, match);
    };

    it("should match requests based on date range", () => {
      const cond: any = {
        conditionType: "WeekdayCondition",
        startDay: 3,
        endDay: 5,
      };
      testCondDay(cond, 0, false);
      testCondDay(cond, 1, false);
      testCondDay(cond, 2, false);
      testCondDay(cond, 3, "match");
      testCondDay(cond, 4, "match");
      testCondDay(cond, 5, "match");
      testCondDay(cond, 6, false);
    });

    it("should match the day if startDay == endDay", () => {
      const cond: any = {
        conditionType: "WeekdayCondition",
        startDay: 3,
        endDay: 3,
      };
      testCondDay(cond, 0, false);
      testCondDay(cond, 1, false);
      testCondDay(cond, 2, false);
      testCondDay(cond, 3, "match");
      testCondDay(cond, 4, false);
      testCondDay(cond, 5, false);
      testCondDay(cond, 6, false);
    });

    it("should not match anything if startDay > endDay", () => {
      const cond: any = {
        conditionType: "WeekdayCondition",
        startDay: 4,
        endDay: 3,
      };
      testCondDay(cond, 0, false);
      testCondDay(cond, 1, false);
      testCondDay(cond, 2, false);
      testCondDay(cond, 3, false);
      testCondDay(cond, 4, false);
      testCondDay(cond, 5, false);
      testCondDay(cond, 6, false);
    });

    it("should match according to .days", () => {
      let cond: any = {
        conditionType: "WeekdayCondition",
        days: "SMTWtFs",
      };
      testCondDay(cond, 0, "match");
      testCondDay(cond, 1, "match");
      testCondDay(cond, 2, "match");
      testCondDay(cond, 3, "match");
      testCondDay(cond, 4, "match");
      testCondDay(cond, 5, "match");
      testCondDay(cond, 6, "match");

      cond = {
        conditionType: "WeekdayCondition",
        days: "S-TW-F-",
      };
      testCondDay(cond, 0, "match");
      testCondDay(cond, 1, false);
      testCondDay(cond, 2, "match");
      testCondDay(cond, 3, "match");
      testCondDay(cond, 4, false);
      testCondDay(cond, 5, "match");
      testCondDay(cond, 6, false);
    });

    it("should prefer .days to .startDay and .endDay", () => {
      const cond: any = {
        conditionType: "WeekdayCondition",
        days: "--TW---",
        startDay: 0,
        endDay: 0,
      };
      testCondDay(cond, 0, false);
      testCondDay(cond, 1, false);
      testCondDay(cond, 2, "match");
      testCondDay(cond, 3, "match");
      testCondDay(cond, 4, false);
      testCondDay(cond, 5, false);
      testCondDay(cond, 6, false);
    });
  });

  describe("TimeCondition", () => {
    let clock: any = null;
    before(() => {
      clock = FakeTimers.install({ now: 0, toFake: ["Date"] });
    });
    after(() => {
      clock.uninstall();
    });

    const testCondTime = (cond: any, time: string, match: any) => {
      clock.setSystemTime(new Date(`01 Feb 2016 ${time}`).getTime());
      testCond(cond, `http://time-${time}/`, match);
    };

    it("should match requests based on hour range", () => {
      const cond: any = {
        conditionType: "TimeCondition",
        startHour: 7,
        endHour: 9,
      };
      testCondTime(cond, "00:00:00", false);
      testCondTime(cond, "06:00:00", false);
      testCondTime(cond, "07:00:00", "match");
      testCondTime(cond, "08:00:00", "match");
      testCondTime(cond, "09:00:00", "match");
      testCondTime(cond, "09:59:59", "match");
      testCondTime(cond, "10:00:00", false);
      testCondTime(cond, "19:00:00", false);
      testCondTime(cond, "23:00:00", false);
    });

    it("should match the hour if startHour == endHour", () => {
      const cond: any = {
        conditionType: "TimeCondition",
        startHour: 7,
        endHour: 7,
      };
      testCondTime(cond, "00:00:00", false);
      testCondTime(cond, "06:00:00", false);
      testCondTime(cond, "07:00:00", "match");
      testCondTime(cond, "07:00:01", "match");
      testCondTime(cond, "07:59:59", "match");
      testCondTime(cond, "08:00:00", false);
      testCondTime(cond, "19:00:00", false);
    });

    it("should not match anything if startHour > endHour", () => {
      const cond: any = {
        conditionType: "TimeCondition",
        startHour: 7,
        endHour: 6,
      };
      testCondTime(cond, "00:00:00", false);
      testCondTime(cond, "06:00:00", false);
      testCondTime(cond, "06:59:59", false);
      testCondTime(cond, "07:00:00", false);
      testCondTime(cond, "08:00:00", false);
      testCondTime(cond, "09:00:00", false);
      testCondTime(cond, "10:00:00", false);
      testCondTime(cond, "19:00:00", false);
      testCondTime(cond, "23:00:00", false);
    });
  });

  describe("#typeFromAbbr", () => {
    it("should get condition types by abbrs", () => {
      Conditions.typeFromAbbr("True").should.equal("TrueCondition");
      Conditions.typeFromAbbr("HR").should.equal("HostRegexCondition");
    });
  });

  describe("#str and #fromStr", () => {
    it("should encode & decode TrueCondition correctly", () => {
      const condition: any = { conditionType: "TrueCondition" };
      const result = Conditions.str(condition);
      result.should.equal("True:");
      const cond = Conditions.fromStr(result);
      cond.should.eql(condition);
    });
    it("should encode & decode conditions with pattern correctly", () => {
      const condition: any = {
        conditionType: "UrlWildcardCondition",
        pattern: "*://*.example.com/*",
      };
      const result = Conditions.str(condition);
      result.should.equal("UrlWildcard: " + condition.pattern);
      const cond = Conditions.fromStr(result);
      cond.should.eql(condition);
    });
    it("should encode & decode False while preserving pattern", () => {
      const condition: any = {
        conditionType: "FalseCondition",
        pattern: "a b c",
      };
      const result = Conditions.str(condition);
      result.should.equal("Disabled: a b c");
      const cond = Conditions.fromStr(result);
      cond.should.eql(condition);
    });
    it("should encode & decode FalseCondition without any pattern", () => {
      const condition: any = { conditionType: "FalseCondition" };
      const result = Conditions.str(condition);
      result.should.equal("Disabled:");
      const cond = Conditions.fromStr(result);
      cond.should.eql({ conditionType: "FalseCondition" } as any);
    });
    it("should encode & decode HostWildcardCondition using shorthand syntax", () => {
      const condition: any = {
        conditionType: "HostWildcardCondition",
        pattern: "*.example.com",
      };
      const result = Conditions.str(condition);
      result.should.equal(condition.pattern);
      const cond = Conditions.fromStr(result);
      cond.should.eql(condition);
    });
    it("should encode & decode HostWildcardCondition ending with colon", () => {
      const condition: any = {
        conditionType: "HostWildcardCondition",
        pattern: "bogus:",
      };
      const result = Conditions.str(condition);
      result.should.equal("HostWildcard: " + condition.pattern);
      const cond = Conditions.fromStr(result);
      cond.should.eql(condition);
    });
    it("should encode & decode BypassCondition correctly", () => {
      const condition: any = {
        conditionType: "BypassCondition",
        pattern: "127.0.0.1/16",
      };
      const result = Conditions.str(condition);
      result.should.equal("Bypass: 127.0.0.1/16");
      const cond = Conditions.fromStr(result);
      cond.should.eql(condition);
    });
    it("should add brackets for IPv6 hosts in BypassCondition", () => {
      const condition: any = {
        conditionType: "BypassCondition",
        pattern: "::1",
      };
      const result = Conditions.str(condition);
      result.should.equal("Bypass: [::1]");
      const cond = Conditions.fromStr(result);
      cond.conditionType.should.equal("BypassCondition");
      cond.pattern.should.equal("[::1]");
    });
    it("should add brackets for IPv6 hosts with scheme in BypassCondition", () => {
      const condition: any = {
        conditionType: "BypassCondition",
        pattern: "http://::1",
      };
      const result = Conditions.str(condition);
      result.should.equal("Bypass: http://[::1]");
      const cond = Conditions.fromStr(result);
      cond.conditionType.should.equal("BypassCondition");
      cond.pattern.should.equal("http://[::1]");
    });
    it("should encode & decode IpCondition correctly", () => {
      const condition: any = {
        conditionType: "IpCondition",
        ip: "127.0.0.1",
        prefixLength: 16,
      };
      const result = Conditions.str(condition);
      result.should.equal("Ip: 127.0.0.1/16");
      const cond = Conditions.fromStr(result);
      cond.should.eql(condition);
    });
    it("should provide sensible fallbacks for invalid IpCondition", () => {
      let cond = Conditions.fromStr("Ip: foo/-233");
      cond.should.eql({
        conditionType: "IpCondition",
        ip: "0.0.0.0",
        prefixLength: 0,
      });

      cond = Conditions.fromStr("Ip: nonsense stuff");
      cond.should.eql({
        conditionType: "IpCondition",
        ip: "0.0.0.0",
        prefixLength: 0,
      });
    });
    it("should assume full match for IpCondition without prefixLength", () => {
      let cond = Conditions.fromStr("Ip: 127.0.0.1");
      cond.should.eql({
        conditionType: "IpCondition",
        ip: "127.0.0.1",
        prefixLength: 32,
      });

      cond = Conditions.fromStr("Ip: ::1");
      cond.should.eql({
        conditionType: "IpCondition",
        ip: "::1",
        prefixLength: 128,
      });
    });
    it("should provide sensible fallbacks for invalid IpCondition", () => {
      const cond = Conditions.fromStr("Ip: 0.0.0.0/-233");
      cond.should.eql({
        conditionType: "IpCondition",
        ip: "0.0.0.0",
        prefixLength: 0,
      });
    });
    it("should encode & decode HostLevelsCondition correctly", () => {
      const condition: any = {
        conditionType: "HostLevelsCondition",
        minValue: 4,
        maxValue: 7,
      };
      const result = Conditions.str(condition);
      result.should.equal("HostLevels: 4~7");
      const cond = Conditions.fromStr(result);
      cond.should.eql(condition);
    });
    it("should provide sensible fallbacks for HostLevels out of range", () => {
      let cond = Conditions.fromStr("HostLevels: A~-1");
      cond.should.eql({
        conditionType: "HostLevelsCondition",
        minValue: 1,
        maxValue: 1,
      });

      cond = Conditions.fromStr("HostLevels: nonsense");
      cond.should.eql({
        conditionType: "HostLevelsCondition",
        minValue: 1,
        maxValue: 1,
      });
    });
    it("should encode & decode WeekdayCondition correctly", () => {
      const condition: any = {
        conditionType: "WeekdayCondition",
        startDay: 3,
        endDay: 6,
      };
      const result = Conditions.str(condition);
      result.should.equal("Weekday: 3~6");
      const cond = Conditions.fromStr(result);
      cond.should.eql(condition);
    });
    it("should provide sensible fallbacks for Weekday out of range", () => {
      let cond = Conditions.fromStr("Weekday: -1~100");
      cond.should.eql({
        conditionType: "WeekdayCondition",
        startDay: 0,
        endDay: 0,
      });

      cond = Conditions.fromStr("Weekday: nonsense");
      cond.should.eql({
        conditionType: "WeekdayCondition",
        startDay: 0,
        endDay: 0,
      });
    });
    it("should encode & decode WeekdayCondition with days", () => {
      let condition: any = {
        conditionType: "WeekdayCondition",
        days: "SMTWtFs",
      };
      let result = Conditions.str(condition);
      result.should.equal("Weekday: SMTWtFs");
      let cond = Conditions.fromStr(result);
      cond.should.eql(condition);

      condition = {
        conditionType: "WeekdayCondition",
        days: "SM-W-Fs",
      };
      result = Conditions.str(condition);
      result.should.equal("Weekday: SM-W-Fs");
      cond = Conditions.fromStr(result);
      cond.should.eql(condition);
    });
    it("should encode & decode TimeCondition correctly", () => {
      const condition: any = {
        conditionType: "TimeCondition",
        startHour: 7,
        endHour: 23,
      };
      const result = Conditions.str(condition);
      result.should.equal("Hour: 7~23");
      const cond = Conditions.fromStr(result);
      cond.should.eql(condition);
    });
    it("should provide sensible fallbacks for Hour out of range", () => {
      let cond = Conditions.fromStr("Hour: -1~100");
      cond.should.eql({
        conditionType: "TimeCondition",
        startHour: 0,
        endHour: 0,
      });

      cond = Conditions.fromStr("Hour: nonsense");
      cond.should.eql({
        conditionType: "TimeCondition",
        startHour: 0,
        endHour: 0,
      });
    });
    it("should parse conditions with extra spaces correctly", () => {
      Conditions.fromStr("url:    *abcde*   ").should.eql({
        conditionType: "UrlWildcardCondition",
        pattern: "*abcde*",
      });
    });
    it("should parse abbreviated condition types correctly", () => {
      Conditions.fromStr("url: *://*.example.com/*").should.eql({
        conditionType: "UrlWildcardCondition",
        pattern: "*://*.example.com/*",
      });
    });
    it("should parse escaped HostWildcardCondition starting with colon", () => {
      Conditions.fromStr(": :bogus:").should.eql({
        conditionType: "HostWildcardCondition",
        pattern: ":bogus:",
      });
    });
  });
});
