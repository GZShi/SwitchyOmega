import OmegaTarget from "omega-target";
import Url from "url";
const ContentTypeRejectedError = OmegaTarget.ContentTypeRejectedError;

interface HintHandler {
  (
    response: { headers: Record<string, string> },
    body: string,
    ctx: { contentType: string; hint: string },
  ): string | undefined;
}

interface FetchResult {
  response: { statusCode: number; headers: Record<string, string> };
  body: string;
}

async function httpGet(url: string): Promise<FetchResult> {
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store", credentials: "omit" });
  } catch (err: any) {
    throw new OmegaTarget.NetworkError(err);
  }
  const headers: Record<string, string> = {};
  res.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });
  const body = await res.text();
  const result: FetchResult = {
    response: { statusCode: res.status, headers },
    body,
  };
  if (res.status >= 200 && res.status < 300) return result;
  const httpErr: any = new Error(`HTTP ${res.status}`);
  httpErr.statusCode = res.status;
  httpErr.body = body;
  if (res.status === 404) throw new OmegaTarget.HttpNotFoundError(httpErr);
  if (res.status >= 500 && res.status < 600)
    throw new OmegaTarget.HttpServerError(httpErr);
  throw new OmegaTarget.HttpError(httpErr);
}

const defaultHintHandler: HintHandler = function (
  _response,
  body,
  { contentType, hint },
) {
  if (`!${contentType}` === hint) {
    throw new ContentTypeRejectedError(
      `Response Content-Type blacklisted: ${contentType}`,
    );
  }
  if (contentType === hint) return body;
  return undefined;
};

const hintHandlers: Record<string, HintHandler> = {
  "*"(_response, body) {
    return body;
  },

  "!text/html"(_response, body, { contentType }) {
    if (contentType === "text/html") {
      let looksLikeHtml = false;
      if (body.includes("<!DOCTYPE") || body.includes("<!doctype")) {
        looksLikeHtml = true;
      } else if (body.includes("</html>")) {
        looksLikeHtml = true;
      } else if (body.includes("</body>")) {
        looksLikeHtml = true;
      }
      if (looksLikeHtml) {
        throw new ContentTypeRejectedError("Response must not be HTML.");
      }
    }
    return undefined;
  },

  "!application/xhtml+xml"(...args: any[]) {
    return hintHandlers["!text/html"](...(args as [any, any, any]));
  },

  "application/x-ns-proxy-autoconfig"(_response, body, { contentType }) {
    if (contentType === "application/x-ns-proxy-autoconfig") return body;
    if (body.includes("FindProxyForURL")) return body;
    return undefined;
  },
};

async function fetchUrl(
  dest_url: string,
  opt_bypass_cache?: boolean,
  opt_type_hints?: string[],
): Promise<any> {
  const getResBody = ({ response, body }: FetchResult): string => {
    if (!opt_type_hints) return body;
    const contentType = (response.headers["content-type"] || "").toLowerCase();
    for (const hint of opt_type_hints) {
      const handler = hintHandlers[hint] || defaultHintHandler;
      const result = handler(response, body, { contentType, hint });
      if (result != null) return result;
    }
    throw new ContentTypeRejectedError(
      `Unrecognized Content-Type: ${contentType}`,
    );
  };

  if (opt_bypass_cache && !dest_url.includes("?")) {
    const parsed: any = Url.parse(dest_url, true);
    parsed.search = undefined;
    parsed.query["_"] = Date.now();
    const dest_url_nocache = Url.format(parsed);
    try {
      return getResBody(await httpGet(dest_url_nocache));
    } catch (_e) {
      return getResBody(await httpGet(dest_url));
    }
  }
  return getResBody(await httpGet(dest_url));
}

export { fetchUrl };
