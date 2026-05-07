const options = require("./options");
const log = require("./log");
const storage = require("./storage");
const browserStorage = require("./browser_storage");
const optionsSync = require("./options_sync");
const utils = require("./utils");
const errors = require("./errors");
const omegaPac = require("omega-pac");

module.exports = {
  Log: log,
  Storage: storage,
  BrowserStorage: browserStorage,
  Options: options,
  OptionsSync: optionsSync,
  OmegaPac: omegaPac,
};

// Flatten utils and errors exports
for (const name of Object.keys(utils)) {
  module.exports[name] = utils[name];
}
for (const name of Object.keys(errors)) {
  module.exports[name] = errors[name];
}
