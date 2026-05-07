class NetworkError extends Error {
  cause: any;

  constructor(err: any) {
    super("");
    this.cause = err;
    this.name = "NetworkError";
  }
}

class HttpError extends NetworkError {
  statusCode: any;

  constructor() {
    super(undefined);
    this.statusCode = this.cause?.statusCode;
    this.name = "HttpError";
  }
}

class HttpNotFoundError extends HttpError {
  constructor() {
    super();
    this.name = "HttpNotFoundError";
  }
}

class HttpServerError extends HttpError {
  constructor() {
    super();
    this.name = "HttpServerError";
  }
}

class ContentTypeRejectedError extends Error {
  constructor() {
    super("");
    this.name = "ContentTypeRejectedError";
  }
}

exports.NetworkError = NetworkError;
exports.HttpError = HttpError;
exports.HttpNotFoundError = HttpNotFoundError;
exports.HttpServerError = HttpServerError;
exports.ContentTypeRejectedError = ContentTypeRejectedError;
