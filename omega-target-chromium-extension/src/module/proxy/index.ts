import { SettingsProxyImpl } from "./proxy_impl_settings";

export function getProxyImpl(log: any): SettingsProxyImpl {
  if (!SettingsProxyImpl.isSupported()) {
    throw new Error("Your browser does not support proxy settings!");
  }
  return new SettingsProxyImpl(log);
}
