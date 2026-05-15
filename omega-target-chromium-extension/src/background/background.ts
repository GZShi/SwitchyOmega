import { logState } from "./log-state.js";
// @ts-expect-error – no .d.ts for these ESM bundles – modules.mjs is a tsdown ESM bundle with no .d.ts
import OmegaTargetChromium from "../modules.mjs";
// draw_omega.js is a plain JS file in img/icons/ — the relative path
// from build/js/background/ is ../../img/icons/draw_omega.js
// @ts-expect-error – no .d.ts for this JS file
import { drawOmega } from "../../img/icons/draw_omega.js";

declare let chrome: any;

const OmegaTargetCurrent = Object.create(OmegaTargetChromium);
// OmegaPac is merged into mod by index.ts — extract for the global-style
// references that still exist throughout this file.
const OmegaPac = OmegaTargetChromium.OmegaPac;

OmegaTargetCurrent.Log = Object.create(OmegaTargetCurrent.Log);
const Log = OmegaTargetCurrent.Log;

let omegaLogFlushTimer: any = null;

function _persistLogToStorage(): void {
  try {
    chrome.storage.local.set({
      "omega.log": logState.buffer,
      "omega.logLastError": logState.lastError,
    });
  } catch (_e) {
    // Ignore storage errors for log persistence
  }
}

function _scheduleLogPersist(): void {
  if (omegaLogFlushTimer != null) clearTimeout(omegaLogFlushTimer);
  omegaLogFlushTimer = setTimeout(() => {
    omegaLogFlushTimer = null;
    _persistLogToStorage();
  }, 3000);
}

function _writeLogToBuffer(content: string): void {
  try {
    logState.buffer += content;
  } catch (_e) {
    logState.buffer = content;
  }
  _scheduleLogPersist();
}

Log.log = function (...args: any[]): void {
  // eslint-disable-next-line no-console -- intentional log export
  console.log(...args);
  const content = `${args.map(Log.str.bind(Log)).join(" ")}\n`;
  _writeLogToBuffer(content);
};

Log.error = function (...args: any[]): void {
  // eslint-disable-next-line no-console -- intentional error export
  console.error(...args);
  const content = args.map(Log.str.bind(Log)).join(" ");
  logState.lastError = content;
  _writeLogToBuffer(`ERROR: ${content}\n`);
  if (omegaLogFlushTimer != null) clearTimeout(omegaLogFlushTimer);
  omegaLogFlushTimer = null;
  _persistLogToStorage();
};

const unhandledPromises: PromiseRejectionEvent[] = [];
const unhandledPromisesId: number[] = [];
let unhandledPromisesNextId = 1;

self.addEventListener(
  "unhandledrejection",
  (event: PromiseRejectionEvent): void => {
    Log.error(
      `[${unhandledPromisesNextId}] Unhandled rejection:\n`,
      event.reason,
    );
    unhandledPromises.push(event);
    unhandledPromisesId.push(unhandledPromisesNextId);
    unhandledPromisesNextId++;
  },
);

self.addEventListener(
  "rejectionhandled",
  (event: PromiseRejectionEvent): void => {
    const index = unhandledPromises.indexOf(event);
    if (index < 0) return;
    Log.log(
      `[${unhandledPromisesId[index]}] Rejection handled!`,
      event.promise,
    );
    unhandledPromises.splice(index, 1);
    unhandledPromisesId.splice(index, 1);
  },
);

const iconCache: any = {};
let drawContext: any = null;
let drawError: any = null;

function drawIcon(resultColor?: string, profileColor?: string): any {
  const cacheKey = `omega+${resultColor ?? ""}+${profileColor}`;
  let icon = iconCache[cacheKey];
  if (icon) return icon;
  try {
    drawContext ??= new OffscreenCanvas(38, 38).getContext("2d")!;
    icon = {};
    for (const size of [16, 19, 24, 32, 38]) {
      drawContext.scale(size, size);
      drawContext.clearRect(0, 0, 1, 1);
      if (resultColor != null) {
        drawOmega(drawContext, resultColor, profileColor);
      } else {
        drawOmega(drawContext, profileColor);
      }
      drawContext.setTransform(1, 0, 0, 1, 0, 0);
      icon[size] = drawContext.getImageData(0, 0, size, size);
      if (icon[size].data[3] === 255) {
        throw new Error(
          "Icon drawing blocked by privacy.resistFingerprinting.",
        );
      }
    }
  } catch (e) {
    if (drawError == null) {
      drawError = e;
      Log.error(e);
      Log.error("Profile-colored icon disabled. Falling back to static icon.");
    }
    icon = null;
  }
  iconCache[cacheKey] = icon;
  return icon;
}

const charCodeUnderscore = "_".charCodeAt(0);
function isHidden(name: string): boolean {
  return (
    name.charCodeAt(0) === charCodeUnderscore &&
    name.charCodeAt(1) === charCodeUnderscore
  );
}

function dispName(name: string): string {
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  return chrome.i18n.getMessage(`profile_${name}`) || name;
}

async function actionForUrl(url: string): Promise<any> {
  try {
    await options.ready;
    const request = OmegaPac.Conditions.requestFromUrl(url);
    const { profile, results } = await options.matchProfile(request);

    let current = options.currentProfile();
    let currentName = dispName(current.name);
    if (current.profileType === "VirtualProfile") {
      const realCurrentName = current.defaultProfileName;
      currentName += ` [${dispName(realCurrentName)}]`;
      current = options.profile(realCurrentName);
    }
    let details = "";
    let direct = false;
    let attached = false;

    const condition2Str = (condition: any) => {
      return condition.pattern ?? OmegaPac.Conditions.str(condition);
    };

    for (const result of results) {
      if (Array.isArray(result)) {
        if (result[1] == null) {
          attached = false;
          let name = result[0];
          if (name[0] === "+") name = name.slice(1);
          if (isHidden(name)) {
            attached = true;
          } else if (name !== current.defaultProfileName) {
            details += chrome.i18n.getMessage(
              "browserAction_defaultRuleDetails",
            );
            details += ` => ${dispName(name)}\n`;
          }
        } else if (result[1].length === 0) {
          if (result[0] === "DIRECT") {
            details += `${chrome.i18n.getMessage("browserAction_directResult")}\n`;
            direct = true;
          } else {
            details += `${result[0]}\n`;
          }
        } else if (typeof result[1] === "string") {
          details += `${result[1]} => ${result[0]}\n`;
        } else {
          const condition = condition2Str(result[1].condition ?? result[1]);
          details += `${condition} => `;
          if (result[0] === "DIRECT") {
            details += `${chrome.i18n.getMessage("browserAction_directResult")}\n`;
            direct = true;
          } else {
            details += `${result[0]}\n`;
          }
        }
      } else if (result.profileName) {
        if (result.isTempRule) {
          details += chrome.i18n.getMessage("browserAction_tempRulePrefix");
        } else if (attached) {
          details += chrome.i18n.getMessage("browserAction_attachedPrefix");
          attached = false;
        }
        const condition = result.source ?? condition2Str(result.condition);
        details += `${condition} => ${dispName(result.profileName)}\n`;
      }
    }

    if (!details) {
      details = options.printProfile(current) ?? "";
    }

    let resultColor = profile.color;
    let profileColor = current.color;
    let icon: any = null;

    if (direct) {
      resultColor = options.profile("direct").color;
      profileColor = profile.color;
    } else if (
      profile.name === current.name &&
      options.isCurrentProfileStatic()
    ) {
      resultColor = profileColor = profile.color;
      icon = drawIcon(profile.color);
    } else {
      resultColor = profile.color;
      profileColor = current.color;
    }

    icon ??= drawIcon(resultColor, profileColor);

    let shortTitle = `Omega: ${currentName}`;
    if (profile.name !== currentName) {
      shortTitle += ` => ${profile.name}`;
    }

    return {
      title: chrome.i18n.getMessage("browserAction_titleWithResult", [
        currentName,
        dispName(profile.name),
        details,
      ]),
      shortTitle,
      icon,
      resultColor,
      profileColor,
    };
  } catch {
    return null;
  }
}

// ---- Initialization ----
const storage = new OmegaTargetCurrent.Storage("local");
const state = new OmegaTargetCurrent.ChromeBrowserStorage("omega.local.");

let sync: any = null;
if (chrome.storage?.sync) {
  const syncStorage = new OmegaTargetCurrent.Storage("sync");
  sync = new OmegaTargetCurrent.OptionsSync(syncStorage);
  sync.transformValue = OmegaTargetCurrent.Options.transformValueForSync;
  // Start disabled; enable only after confirming stored state says "sync".
  // Must be synchronous (before Options.init()) to prevent copyTo() from
  // wiping local data by syncing against an empty sync storage.
  sync.enabled = false;
  void (async () => {
    const st = await state.get({ syncOptions: "" });
    if (st.syncOptions === "sync") {
      sync.enabled = true;
    }
  })();
}

const proxyImpl = OmegaTargetCurrent.proxy.getProxyImpl(Log);
state.set({ proxyImplFeatures: proxyImpl.features });
const options = new OmegaTargetCurrent.Options(
  null,
  storage,
  state,
  Log,
  sync,
  proxyImpl,
);
options.externalApi = new OmegaTargetCurrent.ExternalApi(options);
options.externalApi.listen();

if (chrome.runtime.id !== OmegaTargetCurrent.SwitchySharp.extId) {
  options.switchySharp = new OmegaTargetCurrent.SwitchySharp();
  options.switchySharp.monitor();
}

const tabs = new OmegaTargetCurrent.ChromeTabs(actionForUrl);
tabs.watch();

options._inspect = new OmegaTargetCurrent.Inspect(
  async (url: string, tab: any): Promise<void> => {
    if (url === tab.url) {
      options.clearBadge();
      tabs.processTab(tab);
      state.remove("inspectUrl");
      return;
    }
    state.set({ inspectUrl: url });
    const action = await actionForUrl(url);
    if (!action) return;
    const parsedUrl = OmegaTargetCurrent.Url.parse(url);
    let urlDisp: string;
    if (parsedUrl.hostname === OmegaTargetCurrent.Url.parse(tab.url).hostname) {
      urlDisp = parsedUrl.path;
    } else {
      urlDisp = parsedUrl.hostname;
    }
    const title = `${chrome.i18n.getMessage(
      "browserAction_titleInspect",
      urlDisp,
    )}\n${action.title}`;
    chrome.action.setTitle({ title, tabId: tab.id });
    tabs.setTabBadge(tab, {
      text: "#",
      color: action.resultColor,
    });
  },
);

options.setProxyNotControllable(null);
let timeout: any = null;

proxyImpl.watchProxyChange((details: any): void => {
  if (options.externalApi.disabled) return;
  if (!details) return;
  const notControllableBefore = options.proxyNotControllable();
  let internal = false;
  let noRevert = false;

  switch (details["levelOfControl"]) {
    case "controlled_by_other_extensions":
    case "not_controllable":
      const reason =
        details["levelOfControl"] === "not_controllable" ? "policy" : "app";
      options.setProxyNotControllable(reason);
      noRevert = true;
      break;
    default:
      options.setProxyNotControllable(null);
  }

  if (details["levelOfControl"] === "controlled_by_this_extension") {
    internal = true;
    if (!notControllableBefore) return;
  }

  Log.log("external proxy: ", details);
  if (timeout != null) clearTimeout(timeout);
  let parsed: any = null;
  timeout = setTimeout((): void => {
    if (parsed) {
      options.setExternalProfile(parsed, {
        noRevert,
        internal,
      });
    }
  }, 500);

  parsed = proxyImpl.parseExternalProfile(details, options._options);
});

let external = false;
options.currentProfileChanged = function (reason: string): void {
  iconCache;
  Object.keys(iconCache).forEach((k) => delete iconCache[k]);

  if (reason === "external") {
    external = true;
  } else if (reason !== "clearBadge") {
    external = false;
  }

  let current = options.currentProfile();
  let currentName = "";
  if (current) {
    currentName = dispName(current.name);
    if (current.profileType === "VirtualProfile") {
      const realCurrentName = current.defaultProfileName;
      currentName += ` [${dispName(realCurrentName)}]`;
      current = options.profile(realCurrentName);
    }
  }

  const details = options.printProfile(current) ?? "";
  let title: string;
  let shortTitle: string;
  if (currentName) {
    title = chrome.i18n.getMessage("browserAction_titleWithResult", [
      currentName,
      "",
      details,
    ]);
    shortTitle = `Omega: ${currentName}`;
  } else {
    title = details;
    shortTitle = `Omega: ${details}`;
  }

  if (external && current.profileType !== "SystemProfile") {
    const message = chrome.i18n.getMessage("browserAction_titleExternalProxy");
    title = `${message}\n${title}`;
    shortTitle = `Omega-Extern: ${details}`;
    options.setBadge();
  }

  let icon: any;
  if (!current.name || !OmegaPac.Profiles.isInclusive(current)) {
    icon = drawIcon(current.color);
  } else {
    icon = drawIcon(options.profile("direct").color, current.color);
  }

  tabs.resetAll({
    icon,
    title,
    shortTitle,
  });
};

function encodeError(obj: any): any {
  if (obj instanceof Error) {
    return {
      _error: "error",
      name: obj.name,
      message: obj.message,
      stack: obj.stack,
      original: obj,
    };
  } else {
    return obj;
  }
}

async function refreshActivePageIfEnabled(): Promise<void> {
  try {
    const st = await state.get({ refreshOnProfileChange: false });
    if (!st.refreshOnProfileChange) return;
    const tabs = await new Promise<any[]>((resolve) => {
      chrome.tabs.query({ active: true, lastFocusedWindow: true }, resolve);
    });
    const url = tabs[0]?.url;
    if (!url) return;
    if (url.startsWith("chrome")) return;
    if (url.startsWith("about:")) return;
    await chrome.tabs.reload(tabs[0].id, { bypassCache: true });
  } catch {
    // Tab may have been closed between query and reload
  }
}

chrome.runtime.onMessage.addListener(
  async (
    request: any,
    _sender: any,
    respond: (response: any) => void,
  ): Promise<boolean | undefined> => {
    if (!request?.method) return;
    await options.ready;

    let target: any;
    let method: any;
    if (request.method === "getState") {
      target = state;
      method = state.get;
    } else {
      target = options;
      method = target[request.method];
    }
    if (typeof method !== "function") {
      Log.error(`No such method ${request.method}!`);
      respond({ error: { reason: "noSuchMethod" } });
      return;
    }

    const promise = method.apply(target, request.args);
    if (request.refreshActivePage) {
      void (async () => {
        await promise;
        refreshActivePageIfEnabled();
      })();
    }
    if (request.noReply) return;

    try {
      const result = await promise;
      if (request.method === "updateProfile") {
        for (const key of Object.keys(result)) {
          result[key] = encodeError(result[key]);
        }
      }
      respond({ result });
    } catch (error: any) {
      Log.error(`${request.method} ==>`, error);
      respond({ error: encodeError(error) });
    }

    if (request.noReply) return;
    return true;
  },
);
