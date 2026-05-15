/** Reconstruct an Error object from a serialized background error. */
export function decodeError(obj: any): Error {
  if (obj._error === "error") {
    const err: any = new Error(obj.message);
    err.name = obj.name;
    err.stack = obj.stack;
    err.original = obj.original;
    return err;
  }
  return obj;
}

/** Check if a URL is a browser-internal page that should not be refreshed. */
export function isChromeUrl(url: string): boolean {
  return (
    url.startsWith("chrome") ||
    url.startsWith("about:") ||
    url.startsWith("moz-")
  );
}
