/**
 * Promise wrapper around chrome.runtime.sendMessage.
 * Rejects on chrome.runtime.lastError or after timeoutMs (default 5000).
 */
export function sendMessage<T = any>(
  message: any,
  timeoutMs = 5000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("RPC timeout")), timeoutMs);
    chrome.runtime.sendMessage(message, (response: T) => {
      clearTimeout(timer);
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve(response);
    });
  });
}

/** Thin wrapper around chrome.runtime.connect. Returns the raw Port. */
export function connect(name: string): chrome.runtime.Port {
  return chrome.runtime.connect({ name });
}

export { decodeError, isChromeUrl } from "./rpc";

export function getURL(path: string): string {
  return chrome.runtime.getURL(path);
}

export const RUNTIME_ID: string = chrome.runtime.id;

/** Get the extension manifest. Returns null if not in extension context. */
export function getManifest(): chrome.runtime.Manifest | null {
  try {
    return chrome.runtime.getManifest();
  } catch {
    // Expected when not running in extension context (e.g. dev server)
    return null;
  }
}
