const ListenerProxyImpl = require("./proxy_impl_listener");
const SettingsProxyImpl = require("./proxy_impl_settings");
const ScriptProxyImpl = require("./proxy_impl_script");

exports.proxyImpls = [ListenerProxyImpl, ScriptProxyImpl, SettingsProxyImpl];

exports.getProxyImpl = function (log: any): any {
  for (const Impl of exports.proxyImpls) {
    if (Impl.isSupported()) {
      return new Impl(log);
    }
  }
  throw new Error("Your browser does not support proxy settings!");
};
