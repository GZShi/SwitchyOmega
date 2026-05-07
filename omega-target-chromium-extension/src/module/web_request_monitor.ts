const Heap = require("heap");
const Url = require("url");

class WebRequestMonitor {
  getSummaryId: (req: any) => string;
  _requests: Record<string, any>;
  _recentRequests: any;
  _callbacks: Function[];
  _tabCallbacks: Function[];
  tabInfo: Record<string, any>;
  watching: boolean = false;
  timer: any = null;
  tabsWatching: boolean = false;

  eventCategory: Record<string, string> = {
    start: "ongoing",
    ongoing: "ongoing",
    timeout: "error",
    error: "error",
    timeoutAbort: "error",
    done: "done",
  };

  constructor(getSummaryId: (req: any) => string) {
    this.getSummaryId = getSummaryId;
    this._requests = {};
    this._recentRequests = new Heap((a: any, b: any) => a._startTime - b._startTime);
    this._callbacks = [];
    this._tabCallbacks = [];
    this.tabInfo = {};
  }

  watch(callback: Function): void {
    this._callbacks.push(callback);
    if (this.watching) return;
    if (!chrome.webRequest) {
      console.log("Request monitor disabled! No webRequest permission.");
      return;
    }
    chrome.webRequest.onBeforeRequest.addListener(
      this._requestStart.bind(this),
      { urls: ["<all_urls>"] }
    );
    chrome.webRequest.onHeadersReceived.addListener(
      this._requestHeadersReceived.bind(this),
      { urls: ["<all_urls>"] }
    );
    chrome.webRequest.onBeforeRedirect.addListener(
      this._requestRedirected.bind(this),
      { urls: ["<all_urls>"] }
    );
    chrome.webRequest.onCompleted.addListener(
      this._requestDone.bind(this),
      { urls: ["<all_urls>"] }
    );
    chrome.webRequest.onErrorOccurred.addListener(
      this._requestError.bind(this),
      { urls: ["<all_urls>"] }
    );
    this.watching = true;
  }

  _requestStart(req: any): void {
    if (req.tabId < 0) return;
    req._startTime = Date.now();
    this._requests[req.requestId] = req;
    this._recentRequests.push(req);
    if (this.timer == null) {
      this.timer = setInterval(this._tick.bind(this), 1000);
    }
    for (const callback of this._callbacks) {
      callback("start", req);
    }
  }

  _tick(): void {
    const now = Date.now();
    let req: any;
    while ((req = this._recentRequests.peek())) {
      const reqInfo = this._requests[req.requestId];
      if (reqInfo && !reqInfo.noTimeout) {
        if (now - req._startTime < 5000) {
          break;
        } else {
          reqInfo.timeoutCalled = true;
          for (const callback of this._callbacks) {
            callback("timeout", reqInfo);
          }
        }
      }
      this._recentRequests.pop();
    }
  }

  _requestHeadersReceived(req: any): void {
    const reqInfo = this._requests[req.requestId];
    if (!reqInfo) return;
    reqInfo.noTimeout = true;
    if (reqInfo.timeoutCalled) {
      for (const callback of this._callbacks) {
        callback("ongoing", req);
      }
    }
  }

  _requestRedirected(req: any): void {
    const url = req.redirectUrl;
    if (!url) return;
    if (url.indexOf("data:") === 0 || url.indexOf("about:") === 0) {
      this._requestDone(req);
    }
  }

  _requestError(req: any): void {
    const reqInfo = this._requests[req.requestId];
    delete this._requests[req.requestId];

    if (req.tabId < 0) return;
    if (req.error === "net::ERR_INCOMPLETE_CHUNKED_ENCODING") return;
    if (req.error.indexOf("BLOCKED") >= 0) return;
    if (req.error.indexOf("net::ERR_FILE_") === 0) return;
    if (req.error.indexOf("NS_ERROR_ABORT") === 0) return;
    if (req.url.indexOf("file:") === 0) return;
    if (req.url.indexOf("chrome") === 0) return;
    if (req.url.indexOf("about:") === 0) return;
    if (req.url.indexOf("moz-") === 0) return;
    if (req.url.indexOf("://127.0.0.1") > 0) return;
    if (!reqInfo) return;

    if (req.error === "net::ERR_ABORTED") {
      if (reqInfo.timeoutCalled && !reqInfo.noTimeout) {
        for (const callback of this._callbacks) {
          callback("timeoutAbort", req);
        }
      }
      return;
    }

    for (const callback of this._callbacks) {
      callback("error", req);
    }
  }

  _requestDone(req: any): void {
    for (const callback of this._callbacks) {
      callback("done", req);
    }
    delete this._requests[req.requestId];
  }

  watchTabs(callback: Function): void {
    this._tabCallbacks.push(callback);
    if (this.tabsWatching) return;
    this.watch(this.setTabRequestInfo.bind(this));
    this.tabsWatching = true;

    chrome.tabs.onCreated.addListener((tab: any) => {
      if (!tab.id) return;
      this.tabInfo[tab.id] = this._newTabInfo();
    });

    chrome.tabs.onRemoved.addListener((tab: any) => {
      delete this.tabInfo[tab.id];
    });

    if (chrome.tabs.onReplaced != null) {
      chrome.tabs.onReplaced.addListener((added: any, removed: any) => {
        if (this.tabInfo[added] == null) this.tabInfo[added] = this._newTabInfo();
        delete this.tabInfo[removed];
      });
    }

    chrome.tabs.onUpdated.addListener((tabId: number, changeInfo: any, tab: any) => {
      if (this.tabInfo[tab.id] == null) this.tabInfo[tab.id] = this._newTabInfo();
      const info = this.tabInfo[tab.id];
      if (!info) return;
      for (const cb of this._tabCallbacks) {
        cb(tab.id, info, null, "updated");
      }
    });

    chrome.tabs.query({}, (tabs: any[]) => {
      for (const tab of tabs) {
        if (this.tabInfo[tab.id] == null) this.tabInfo[tab.id] = this._newTabInfo();
      }
    });
  }

  _newTabInfo(): any {
    return {
      requests: {},
      requestCount: 0,
      requestStatus: {},
      ongoingCount: 0,
      errorCount: 0,
      doneCount: 0,
      summary: {},
    };
  }

  setTabRequestInfo(status: string, req: any): void {
    const info = this.tabInfo[req.tabId];
    if (info) {
      if (status === "start" && req.type === "main_frame") {
        if (req.url.indexOf("chrome://errorpage/") !== 0) {
          for (const key of Object.keys(this._newTabInfo())) {
            info[key] = this._newTabInfo()[key];
          }
        }
      }
      if (info.requestCount > 1000) return;
      info.requests[req.requestId] = req;
      const oldStatus = info.requestStatus[req.requestId];
      if (oldStatus) {
        info[this.eventCategory[oldStatus] + "Count"]--;
      } else {
        if (status === "timeoutAbort") return;
        info.requestCount++;
      }
      info.requestStatus[req.requestId] = status;
      info[this.eventCategory[status] + "Count"]++;

      const id = this.getSummaryId != null ? this.getSummaryId(req) : undefined;
      if (id != null) {
        if (this.eventCategory[status] === "error") {
          if (this.eventCategory[oldStatus] !== "error") {
            let summaryItem = info.summary[id];
            if (summaryItem == null) {
              summaryItem = info.summary[id] = { errorCount: 0 };
            }
            summaryItem.errorCount++;
          }
        } else if (this.eventCategory[oldStatus] === "error") {
          const summaryItem = info.summary[id];
          if (summaryItem != null) summaryItem.errorCount--;
        }
      }

      for (const callback of this._tabCallbacks) {
        callback(req.tabId, info, req, status);
      }
    }
  }
}

module.exports = WebRequestMonitor;
