import * as Conditions from "./conditions";
import * as PacGenerator from "./pac_generator";
import * as Profiles from "./profiles";
import * as RuleList from "./rule_list";
import * as ShexpUtils from "./shexp_utils";
import {
  Revision,
  AttachedCache,
  isIp,
  getBaseDomain,
  wildcardForDomain,
  wildcardForUrl,
} from "./utils";

export {
  Conditions,
  PacGenerator,
  Profiles,
  RuleList,
  ShexpUtils,
  Revision,
  AttachedCache,
  isIp,
  getBaseDomain,
  wildcardForDomain,
  wildcardForUrl,
};

// Default export keeps the legacy `const OmegaPac = require('omega-pac')`
// consumer shape intact (flat access to namespaces + utils helpers).
const OmegaPac = {
  Conditions,
  PacGenerator,
  Profiles,
  RuleList,
  ShexpUtils,
  Revision,
  AttachedCache,
  isIp,
  getBaseDomain,
  wildcardForDomain,
  wildcardForUrl,
};

export default OmegaPac;
