import { OmegaDebug } from "./debug.js";

declare var chrome: any;

(self as any).UglifyJS_NoUnsafeEval = true;

if (chrome.contextMenus != null) {
  chrome.contextMenus.removeAll(() => {
    if (chrome.i18n.getUILanguage != null) {
      chrome.contextMenus.create({
        id: "enableQuickSwitch",
        title: chrome.i18n.getMessage("contextMenu_enableQuickSwitch"),
        type: "checkbox",
        checked: false,
        contexts: ["action"],
      });
    }

    chrome.contextMenus.create({
      id: "reportIssue",
      title: chrome.i18n.getMessage("popup_reportIssues"),
      contexts: ["action"],
    });

    chrome.contextMenus.create({
      id: "downloadLog",
      title: chrome.i18n.getMessage("popup_errorLog"),
      contexts: ["action"],
    });

    chrome.contextMenus.onClicked.addListener((info: any): void => {
      switch (info.menuItemId) {
        case "enableQuickSwitch": {
          const handler = (self as any).OmegaContextMenuQuickSwitchHandler;
          if (typeof handler === "function") handler(info);
          break;
        }
        case "reportIssue":
          OmegaDebug.reportIssue();
          break;
        case "downloadLog":
          OmegaDebug.downloadLog();
          break;
      }
    });
  });
}
