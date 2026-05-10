import { should as chaiShould } from "chai";
import * as RuleList from "../src/rule_list";

chaiShould();

describe("RuleList", () => {
  describe("AutoProxy", () => {
    const parse = (RuleList as any)["AutoProxy"].parse;

    it("should parse keyword conditions", () => {
      const line = "example.com";
      const result = parse(line, "match", "notmatch");
      result.should.have.length(1);
      result[0].should.eql({
        source: line,
        profileName: "match",
        condition: {
          conditionType: "KeywordCondition",
          pattern: "example.com",
        },
      });
    });

    it("should parse keyword conditions with asterisks", () => {
      const line = "example*.com";
      const result = parse(line, "match", "notmatch");
      result.should.have.length(1);
      result[0].should.eql({
        source: line,
        profileName: "match",
        condition: {
          conditionType: "UrlWildcardCondition",
          pattern: "http://*example*.com*",
        },
      });
    });

    it("should parse host conditions", () => {
      const line = "||example.com";
      const result = parse(line, "match", "notmatch");
      result.should.have.length(1);
      result[0].should.eql({
        source: line,
        profileName: "match",
        condition: {
          conditionType: "HostWildcardCondition",
          pattern: "*.example.com",
        },
      });
    });

    it('should parse "starts-with" conditions', () => {
      const line = "|https://ssl.example.com";
      const result = parse(line, "match", "notmatch");
      result.should.have.length(1);
      result[0].should.eql({
        source: line,
        profileName: "match",
        condition: {
          conditionType: "UrlWildcardCondition",
          pattern: "https://ssl.example.com*",
        },
      });
    });

    it('should parse "starts-with" conditions for the HTTP scheme', () => {
      const line = "|http://example.com";
      const result = parse(line, "match", "notmatch");
      result.should.have.length(1);
      result[0].should.eql({
        source: line,
        profileName: "match",
        condition: {
          conditionType: "UrlWildcardCondition",
          pattern: "http://example.com*",
        },
      });
    });

    it("should parse url regex conditions", () => {
      const line = "/^https?:\\/\\/[^\\/]+example\.com/";
      const result = parse(line, "match", "notmatch");
      result.should.have.length(1);
      result[0].should.eql({
        source: line,
        profileName: "match",
        condition: {
          conditionType: "UrlRegexCondition",
          pattern: "^https?:\\/\\/[^\\/]+example\.com",
        },
      });
    });

    it("should ignore comment lines", () => {
      const result = parse("!example.com", "match", "notmatch");
      result.should.have.length(0);
    });

    it("should parse multiple lines", () => {
      const result = parse(
        "example.com\n!comment\n||example.com",
        "match",
        "notmatch",
      );
      result.should.have.length(2);
      result[0].should.eql({
        source: "example.com",
        profileName: "match",
        condition: {
          conditionType: "KeywordCondition",
          pattern: "example.com",
        },
      });
      result[1].should.eql({
        source: "||example.com",
        profileName: "match",
        condition: {
          conditionType: "HostWildcardCondition",
          pattern: "*.example.com",
        },
      });
    });

    it("should put exclusive rules first", () => {
      const result = parse("example.com\n@@||example.com", "match", "notmatch");
      result.should.have.length(2);
      result[0].should.eql({
        source: "@@||example.com",
        profileName: "notmatch",
        condition: {
          conditionType: "HostWildcardCondition",
          pattern: "*.example.com",
        },
      });
      result[1].should.eql({
        source: "example.com",
        profileName: "match",
        condition: {
          conditionType: "KeywordCondition",
          pattern: "example.com",
        },
      });
    });
  });

  describe("Switchy", () => {
    const parse = (RuleList as any)["Switchy"].parse;

    const compose = (sections: { [key: string]: string[] }) => {
      let list = "#BEGIN\r\n\r\n";
      for (const sec of Object.keys(sections)) {
        const rules = sections[sec];
        list += `[${sec}]\r\n`;
        for (const rule of rules) {
          list += rule;
          list += "\r\n";
        }
      }
      list += "\r\n\r\n#END\r\n";
      return list;
    };

    it("should parse empty rule lists", () => {
      const list = compose({});
      const result = parse(list, "match", "notmatch");
      result.should.have.length(0);
    });

    it("should ignore stuff before #BEGIN or after #END.", () => {
      let list = compose({});
      list += "[RegExp]\r\ntest\r\n";
      list = "[Wildcard]\r\ntest\r\n" + list;
      const result = parse(list, "match", "notmatch");
      result.should.have.length(0);
    });

    it("should parse wildcard rules", () => {
      const list = compose({ Wildcard: ["*://example.com/abc/*"] });
      const result = parse(list, "match", "notmatch");
      result.should.have.length(1);
      result[0].should.eql({
        source: "*://example.com/abc/*",
        profileName: "match",
        condition: {
          conditionType: "UrlWildcardCondition",
          pattern: "*://example.com/abc/*",
        },
      });
    });

    it("should parse RegExp rules", () => {
      const list = compose({ RegExp: ["^http://www\.example\.com/.*"] });
      const result = parse(list, "match", "notmatch");
      result.should.have.length(1);
      result[0].should.eql({
        source: "^http://www\.example\.com/.*",
        profileName: "match",
        condition: {
          conditionType: "UrlRegexCondition",
          pattern: "^http://www\.example\.com/.*",
        },
      });
    });

    it("should parse exclusive rules", () => {
      const list = compose({ RegExp: ["!^http://www\.example\.com/.*"] });
      const result = parse(list, "match", "notmatch");
      result.should.have.length(1);
      result[0].should.eql({
        source: "!^http://www\.example\.com/.*",
        profileName: "notmatch",
        condition: {
          conditionType: "UrlRegexCondition",
          pattern: "^http://www\.example\.com/.*",
        },
      });
    });

    it("should parse multiple rules in multiple sections", () => {
      const list = compose({
        Wildcard: ["http://www.example.com/*", "http://example.com/*"],
        RegExp: ["^http://www\.example\.com/.*", "^http://example\.com/.*"],
      });
      const result = parse(list, "match", "notmatch");
      result.should.have.length(4);
      result[0].should.eql({
        source: "http://www.example.com/*",
        profileName: "match",
        condition: {
          conditionType: "UrlWildcardCondition",
          pattern: "http://www.example.com/*",
        },
      });
      result[1].should.eql({
        source: "http://example.com/*",
        profileName: "match",
        condition: {
          conditionType: "UrlWildcardCondition",
          pattern: "http://example.com/*",
        },
      });
      result[2].should.eql({
        source: "^http://www\.example\.com/.*",
        profileName: "match",
        condition: {
          conditionType: "UrlRegexCondition",
          pattern: "^http://www\.example\.com/.*",
        },
      });
      result[3].should.eql({
        source: "^http://example\.com/.*",
        profileName: "match",
        condition: {
          conditionType: "UrlRegexCondition",
          pattern: "^http://example\.com/.*",
        },
      });
    });

    it("should put exclusive rules first", () => {
      const list = compose({
        Wildcard: ["http://www\.example\.com/*"],
        RegExp: ["!^http://www\.example\.com/.*"],
      });
      const result = parse(list, "match", "notmatch");
      result.should.have.length(2);
      result[0].should.eql({
        source: "!^http://www\.example\.com/.*",
        profileName: "notmatch",
        condition: {
          conditionType: "UrlRegexCondition",
          pattern: "^http://www.example\.com/.*",
        },
      });
      result[1].should.eql({
        source: "http://www\.example\.com/*",
        profileName: "match",
        condition: {
          conditionType: "UrlWildcardCondition",
          pattern: "http://www.example.com/*",
        },
      });
    });
  });

  describe("Switchy (omega format)", () => {
    const parse = (RuleList as any)["Switchy"].parse;
    const compose = (RuleList as any)["Switchy"].compose;

    it("should parse empty rule lists", () => {
      const list = compose({ rules: [] });
      const result = parse(list, "match", "notmatch");
      result.should.have.length(0);
    });

    it("should ignore comment lines.", () => {
      let list = compose({ rules: [] });
      list += ";*.example.com \r\n";
      const result = parse(list, "match", "notmatch");
      result.should.have.length(0);
    });

    it("should compose and parse HostWildcardCondition", () => {
      const rule = {
        source: "*.example.com",
        condition: {
          conditionType: "HostWildcardCondition",
          pattern: "*.example.com",
        },
        profileName: "match",
      };
      const list = compose({ rules: [rule], defaultProfileName: "notmatch" });
      const result = parse(list, "match", "notmatch");
      result.should.have.length(1);
      result[0].should.eql(rule);
    });

    it("should compose and parse HostRegexCondition", () => {
      const rule = {
        source: "HostRegex: ^http://www\.example\.com/.*",
        condition: {
          conditionType: "HostRegexCondition",
          pattern: "^http://www\.example\.com/.*",
        },
        profileName: "match",
      };
      const list = compose({ rules: [rule], defaultProfileName: "notmatch" });
      const result = parse(list, "match", "notmatch");
      result.should.have.length(1);
      result[0].should.eql(rule);
    });

    it("should compose and parse disabled rules", () => {
      const rule = {
        source: "Disabled: *.example.com",
        condition: {
          conditionType: "FalseCondition",
          pattern: "*.example.com",
        },
        profileName: "match",
      };
      const list = compose({ rules: [rule], defaultProfileName: "notmatch" });
      const result = parse(list, "match", "notmatch");
      result.should.have.length(1);
      result[0].should.eql(rule);
    });

    it("should compose and parse exclusive rules", () => {
      const rule = {
        source: "!*.example.com",
        condition: {
          conditionType: "HostWildcardCondition",
          pattern: "*.example.com",
        },
        profileName: "notmatch",
      };
      const list = compose({ rules: [rule], defaultProfileName: "notmatch" });
      const result = parse(list, "match", "notmatch");
      result.should.have.length(1);
      result[0].should.eql(rule);
    });

    it("should compose and parse conditions starting with special chars", () => {
      const rule = {
        source: ": ;abc",
        condition: {
          conditionType: "HostWildcardCondition",
          pattern: ";abc",
        },
        profileName: "match",
      };
      const list = compose({ rules: [rule], defaultProfileName: "notmatch" });
      const result = parse(list, "match", "notmatch");
      result.should.have.length(1);
      result[0].should.eql(rule);
    });

    it("should parse multiple conditions", () => {
      const rules = [
        {
          source: "*.example.com",
          condition: {
            conditionType: "HostWildcardCondition",
            pattern: "*.example.com",
          },
          profileName: "match",
        },
        {
          source: "*.example.org",
          condition: {
            conditionType: "HostWildcardCondition",
            pattern: "*.example.org",
          },
          profileName: "match",
        },
      ];
      const list = compose({ rules: rules, defaultProfileName: "notmatch" });
      const result = parse(list, "match", "notmatch");
      result.should.eql(rules);
    });

    it("should respect the top-down order of conditions", () => {
      const rules = [
        {
          source: "b.example.com",
          condition: {
            conditionType: "HostWildcardCondition",
            pattern: "b.example.com",
          },
          profileName: "match",
        },
        {
          source: "!a.example.org",
          condition: {
            conditionType: "HostWildcardCondition",
            pattern: "a.example.org",
          },
          profileName: "notmatch",
        },
      ];
      const list = compose({ rules: rules, defaultProfileName: "notmatch" });
      const result = parse(list, "match", "notmatch");
      result.should.eql(rules);
    });

    it("should add a default rule when results are enabled", () => {
      const list = compose(
        { rules: [], defaultProfileName: "notmatch" },
        { withResult: true },
      );
      list.split(/\r|\n/).should.contain("@with result");
      const result = parse(list, "ignored", "alsoIgnored");
      result.should.have.length(1);
      result[0].should.eql({
        source: "*",
        condition: {
          conditionType: "HostWildcardCondition",
          pattern: "*",
        },
        profileName: "notmatch",
      });
    });

    it("should compose and parse conditions with results", () => {
      const rules = [
        {
          source: "b.example.com",
          condition: {
            conditionType: "HostWildcardCondition",
            pattern: "b.example.com",
          },
          profileName: "abc",
        },
        {
          source: "a.example.org",
          condition: {
            conditionType: "HostWildcardCondition",
            pattern: "a.example.org",
          },
          profileName: "def",
        },
      ];
      const list = compose(
        { rules: rules, defaultProfileName: "ghi" },
        { withResult: true },
      );
      const result = parse(list, "ignored", "alsoIgnored");
      rules.push({
        source: "*",
        condition: {
          conditionType: "HostWildcardCondition",
          pattern: "*",
        },
        profileName: "ghi",
      });
      result.should.eql(rules);
    });

    it("should compose and parse exclusive conditions with results", () => {
      const rules = [
        {
          source: "!b.example.com",
          condition: {
            conditionType: "HostWildcardCondition",
            pattern: "b.example.com",
          },
          profileName: "default profile",
        },
        {
          source: "a.example.org",
          condition: {
            conditionType: "HostWildcardCondition",
            pattern: "a.example.org",
          },
          profileName: "some profile",
        },
      ];
      const list = compose(
        { rules: rules, defaultProfileName: "default profile" },
        { withResult: true, useExclusive: true },
      );
      const result = parse(list, "ignored", "alsoIgnored");
      rules.push({
        source: "*",
        condition: {
          conditionType: "HostWildcardCondition",
          pattern: "*",
        },
        profileName: "default profile",
      });
      result.should.eql(rules);
    });
  });
});
