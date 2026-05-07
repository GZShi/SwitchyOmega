const OmegaTarget = require("omega-target");
const Promise = OmegaTarget.Promise;
const xhr = Promise.promisify(require("xhr"));
const Url = require("url");
const ContentTypeRejectedError = OmegaTarget.ContentTypeRejectedError;

interface HintHandler {
  (response: any, body: string, ctx: { contentType: string; hint: string }): string | undefined;
}

const xhrWrapper = function (...args: any[]) {
  return xhr(...args).catch(function (err: any) {
    if (!err.isOperational) throw err;
    if (!err.statusCode) throw new OmegaTarget.NetworkError(err);
    if (err.statusCode === 404) throw new OmegaTarget.HttpNotFoundError(err);
    if (err.statusCode >= 500 && err.statusCode < 600)
      throw new OmegaTarget.HttpServerError(err);
    throw new OmegaTarget.HttpError(err);
  });
};

const defaultHintHandler: HintHandler = function (response, body, { contentType, hint }) {
  if ("!" + contentType === hint) {
    throw new ContentTypeRejectedError("Response Content-Type blacklisted: " + contentType);
  }
  if (contentType === hint) return body;
  return undefined;
};

const hintHandlers: Record<string, HintHandler> = {
  "*": function (_response, body) {
    return body;
  },

  "!text/html": function (response, body, { contentType }) {
    if (contentType === "text/html") {
      let looksLikeHtml = false;
      if (body.indexOf("<!DOCTYPE") >= 0 || body.indexOf("<!doctype") >= 0) {
        looksLikeHtml = true;
      } else if (body.indexOf("</html>") >= 0) {
        looksLikeHtml = true;
      } else if (body.indexOf("</body>") >= 0) {
        looksLikeHtml = true;
      }
      if (looksLikeHtml) {
        throw new ContentTypeRejectedError("Response must not be HTML.");
      }
    }
    return undefined;
  },

  "!application/xhtml+xml": function (...args: any[]) {
    return hintHandlers["!text/html"](...args as any);
  },

  "application/x-ns-proxy-autoconfig": function (response, body, { contentType }) {
    if (contentType === "application/x-ns-proxy-autoconfig") return body;
    if (body.indexOf("FindProxyForURL") >= 0) return body;
    return undefined;
  },
};

function fetchUrl(
  dest_url: string,
  opt_bypass_cache?: boolean,
  opt_type_hints?: string[]
): Promise<any> {
  const getResBody = function ([response, body]: [any, string]) {
    if (!opt_type_hints) return body;
    const contentType = (response.headers["content-type"] || "").toLowerCase();
    for (const hint of opt_type_hints) {
      const handler = hintHandlers[hint] || defaultHintHandler;
      const result = handler(response, body, { contentType, hint });
      if (result != null) return result;
    }
    throw new ContentTypeRejectedError("Unrecognized Content-Type: " + contentType);
  };

  if (opt_bypass_cache && dest_url.indexOf("?") < 0) {
    const parsed: any = Url.parse(dest_url, true);
    parsed.search = undefined;
    parsed.query["_"] = Date.now();
    const dest_url_nocache = Url.format(parsed);
    return xhrWrapper(dest_url_nocache).then(getResBody).catch(() => {
      return xhrWrapper(dest_url).then(getResBody);
    });
  } else {
    return xhrWrapper(dest_url).then(getResBody);
  }
}

module.exports = fetchUrl;
