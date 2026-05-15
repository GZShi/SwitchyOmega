export class NetworkError extends Error {
  override name = "NetworkError";

  constructor(err?: unknown) {
    super(err instanceof Error ? err.message : "", { cause: err });
  }
}

export class HttpError extends NetworkError {
  override name = "HttpError";
  statusCode?: number;

  constructor(err?: Error & { statusCode?: number }) {
    super(err);
    this.statusCode = err?.statusCode;
  }
}

export class HttpNotFoundError extends HttpError {
  override name = "HttpNotFoundError";
}

export class HttpServerError extends HttpError {
  override name = "HttpServerError";
}

export class ContentTypeRejectedError extends Error {
  override name = "ContentTypeRejectedError";

  constructor(message?: string) {
    super(message ?? "");
  }
}
