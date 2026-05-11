import OmegaPac from "omega-pac";
import Log from "./log";
import Storage from "./storage";
import BrowserStorage from "./browser_storage";
import Options from "./options";
import OptionsSync from "./options_sync";
import {
  NetworkError,
  HttpError,
  HttpNotFoundError,
  HttpServerError,
  ContentTypeRejectedError,
} from "./errors";

export {
  Log,
  Storage,
  BrowserStorage,
  Options,
  OptionsSync,
  OmegaPac,
  NetworkError,
  HttpError,
  HttpNotFoundError,
  HttpServerError,
  ContentTypeRejectedError,
};

// Default export mirrors the UMD global shape consumed by the chromium
// extension (`window.OmegaTarget.Options`, `OmegaTarget.Log.log(...)`, etc.)
// and the CJS-interop form used by `const OmegaTarget = require("omega-target")`.
const OmegaTarget = {
  Log,
  Storage,
  BrowserStorage,
  Options,
  OptionsSync,
  OmegaPac,
  NetworkError,
  HttpError,
  HttpNotFoundError,
  HttpServerError,
  ContentTypeRejectedError,
};

export default OmegaTarget;
