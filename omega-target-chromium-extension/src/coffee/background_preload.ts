declare var chrome: any;
declare var OmegaDebug: any;
declare var localStorage: any;

(window as any).UglifyJS_NoUnsafeEval = true;
localStorage["log"] = "";
localStorage["logLastError"] = "";

(window as any).OmegaContextMenuQuickSwitchHandler = function (): null {
  return null;
};

if (chrome.contextMenus != null) {
  if (chrome.i18n.getUILanguage != null) {
    chrome.contextMenus.create({
      id: "enableQuickSwitch",
      title: chrome.i18n.getMessage("contextMenu_enableQuickSwitch"),
      type: "checkbox",
      checked: false,
      contexts: ["browser_action"],
      onclick: function (info: any): void {
        (window as any).OmegaContextMenuQuickSwitchHandler(info);
      },
    });
  }

  chrome.contextMenus.create({
    title: chrome.i18n.getMessage("popup_reportIssues"),
    contexts: ["browser_action"],
    onclick: function (): void {
      OmegaDebug.reportIssue();
    },
  });

  chrome.contextMenus.create({
    title: chrome.i18n.getMessage("popup_errorLog"),
    contexts: ["browser_action"],
    onclick: function (): void {
      OmegaDebug.downloadLog();
    },
  });
}
