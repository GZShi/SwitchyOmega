// Minimal browser-compatible shim for Node.js `url` module.
// Only implements `parse` and `format` — the two functions used by this package.

interface ParsedUrl {
  protocol: string;
  slashes: boolean;
  auth: string | null;
  host: string;
  port: string;
  hostname: string;
  hash: string;
  search: string;
  query: string | Record<string, string>;
  pathname: string;
  path: string;
  href: string;
}

function parse(urlStr: string, parseQueryString?: boolean): ParsedUrl {
  const u = new URL(urlStr);
  const query = parseQueryString
    ? Object.fromEntries(u.searchParams.entries())
    : u.search.replace("?", "");
  return {
    protocol: u.protocol.replace(":", ""),
    slashes: true,
    auth: u.username ? `${u.username}:${u.password}` : null,
    host: u.host,
    port: u.port,
    hostname: u.hostname,
    hash: u.hash,
    search: u.search,
    query,
    pathname: u.pathname,
    path: u.pathname + u.search,
    href: u.href,
  };
}

function format(urlObj: Partial<ParsedUrl>): string {
  const protocol = urlObj.protocol ?? "http";
  const host = urlObj.host ?? urlObj.hostname ?? "";
  const pathname = urlObj.pathname ?? "/";
  const search = urlObj.search ?? "";
  const hash = urlObj.hash ?? "";
  let url = `${protocol}://${host}${pathname}${search}${hash}`;
  // If query was modified as an object, append it
  if (urlObj.query && typeof urlObj.query === "object" && !urlObj.search) {
    const params = new URLSearchParams(urlObj.query);
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }
  return url;
}

export { parse, format };
export default { parse, format };
