// Minimal browser-compatible shim for Node.js `querystring` module.
// Only implements `parse` — the one function used by this package.

function parse(
  str: string,
  _sep?: string,
  _eq?: string,
  _options?: unknown,
): Record<string, string> {
  const params = new URLSearchParams(str);
  const result: Record<string, string> = {};
  for (const [key, value] of params) {
    result[key] = value;
  }
  return result;
}

export { parse };
export default { parse };
