// Error logger for the service worker.  Registers a global `onerror`
// handler at module load time so that unhandled errors end up in the
// shared log buffer.
import { logState } from "./log_state.js";

(self as any).onerror = (
  message: any,
  url: any,
  line: any,
  col: any,
  err: any,
) => {
  if (err?.stack) {
    logState.buffer += `${err.stack}\n\n`;
  } else {
    logState.buffer += `${url}:${line}:${col}:\t${message}\n\n`;
  }
};
