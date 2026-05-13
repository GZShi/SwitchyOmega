declare var chrome: any;
declare var OmegaDebug: any;
declare var omegaLogBuffer: string;
declare var omegaLogLastError: string;

(self as any).OmegaDebug = {
  getProjectVersion(): string {
    return chrome.runtime.getManifest().version;
  },

  getExtensionVersion(): string {
    return chrome.runtime.getManifest().version;
  },

  downloadLog(): void {
    const blob = new Blob([omegaLogBuffer], {
      type: "text/plain;charset=utf-8",
    });
    const filename = `OmegaLog_${Date.now()}.txt`;
    const reader = new FileReader();
    reader.onload = () => {
      chrome.downloads.download({
        url: reader.result as string,
        filename,
      });
    };
    reader.readAsDataURL(blob);
  },

  resetOptions(): void {
    omegaLogBuffer = "";
    omegaLogLastError = "";
    chrome.storage.local.clear();
    chrome.storage.sync.clear();
    chrome.runtime.reload();
  },

  reportIssue(): void {
    let url =
      "https://github.com/FelisCatus/SwitchyOmega/issues/new?title=&body=";
    let finalUrl = url;
    try {
      const projectVersion = OmegaDebug.getProjectVersion();
      const extensionVersion = OmegaDebug.getExtensionVersion();
      const env = {
        extensionVersion,
        projectVersion: extensionVersion,
        userAgent: navigator.userAgent,
      };
      let body = chrome.i18n.getMessage("popup_issueTemplate", [
        env.projectVersion,
        env.userAgent,
      ]);
      body ??=
        `\n\n` +
        `<!-- Please write your comment ABOVE this line. -->\n` +
        `SwitchyOmega ${env.projectVersion}\n${env.userAgent}\n`;
      finalUrl = url + encodeURIComponent(body);
      const err = omegaLogLastError;
      if (err) {
        body += `\n\`\`\`\n${err}\n\`\`\``;
        finalUrl = (url + encodeURIComponent(body)).slice(0, 2000);
      }
    } catch (_e) {
      // fall through
    }
    chrome.tabs.create({ url: finalUrl });
  },
};
