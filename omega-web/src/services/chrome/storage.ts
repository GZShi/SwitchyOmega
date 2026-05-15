export function localGet(
  keys: string | string[] | Record<string, any> | null,
): Promise<Record<string, any>> {
  return new Promise((resolve) => {
    (chrome.storage.local.get as any)(keys, resolve);
  });
}

export function localSet(items: Record<string, any>): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set(items, resolve);
  });
}

export const localAvailable: boolean =
  typeof chrome !== "undefined" && chrome?.storage?.local != null;
