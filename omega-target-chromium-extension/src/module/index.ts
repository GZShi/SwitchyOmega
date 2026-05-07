const mod = {
  Storage: require("./storage"),
  Options: require("./options"),
  ChromeTabs: require("./tabs"),
  SwitchySharp: require("./switchysharp"),
  ExternalApi: require("./external_api"),
  WebRequestMonitor: require("./web_request_monitor"),
  Inspect: require("./inspect"),
  Url: require("url"),
  proxy: require("./proxy"),
};

// Merge omega-target exports
const omegaTarget = require("omega-target");
for (const name of Object.keys(omegaTarget)) {
  if (mod[name as keyof typeof mod] == null) {
    (mod as any)[name] = omegaTarget[name];
  }
}

module.exports = mod;
