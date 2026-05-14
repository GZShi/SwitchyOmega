declare let chrome: any;

/**
 * Promise wrapper around chrome.runtime.sendMessage.
 * Rejects on chrome.runtime.lastError; resolves with the raw response on success.
 */
export function sendMessage<T = any>(message: any): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: T) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve(response);
    });
  });
}

/** Fire-and-forget sendMessage (no callback, no wait). */
export function sendMessageNoReply(message: any): void {
  chrome.runtime.sendMessage(message);
}

/** Thin wrapper around chrome.runtime.connect. Returns the raw Port. */
export function connect(name: string): any {
  return chrome.runtime.connect({ name });
}

export function getURL(path: string): string {
  return chrome.runtime.getURL(path);
}

export const RUNTIME_ID: string = chrome.runtime.id;
