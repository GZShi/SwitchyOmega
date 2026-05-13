import { ChromeStorage as Storage } from "./storage";
import { ChromeOptions as Options } from "./options";
import { ChromeTabs } from "./tabs";
import { SwitchySharp } from "./switchysharp";
import { ExternalApi } from "./external_api";
import { WebRequestMonitor } from "./web_request_monitor";
import { Inspect } from "./inspect";
import { ChromeBrowserStorage } from "./chrome_browser_storage";
import Url from "url";
import * as proxy from "./proxy";
import omegaTarget from "omega-target";

const mod: any = {
  Storage,
  Options,
  ChromeTabs,
  SwitchySharp,
  ExternalApi,
  WebRequestMonitor,
  Inspect,
  ChromeBrowserStorage,
  Url,
  proxy,
};

// Merge omega-target exports
for (const name of Object.keys(omegaTarget)) {
  mod[name] ??= omegaTarget[name];
}

export { mod };
export default mod;
