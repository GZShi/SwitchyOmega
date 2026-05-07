const conditions = require('./conditions');
const pacGenerator = require('./pac_generator');
const profiles = require('./profiles');
const ruleList = require('./rule_list');
const shexpUtils = require('./shexp_utils');
const utils = require('./utils');

module.exports = {
  Conditions: conditions,
  PacGenerator: pacGenerator,
  Profiles: profiles,
  RuleList: ruleList,
  ShexpUtils: shexpUtils
};

// Flatten utils exports onto the main exports
for (const name of Object.keys(utils)) {
  module.exports[name] = utils[name];
}
