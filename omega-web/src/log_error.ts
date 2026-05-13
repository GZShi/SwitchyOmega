// Standalone error logger. Loaded by the background page / service worker
// to capture unhandled errors for later debugging.
declare var omegaLogBuffer: string;

(self as any).onerror = (
  message: any,
  url: any,
  line: any,
  col: any,
  err: any,
) => {
  if (err?.stack) {
    omegaLogBuffer += `${err.stack}\n\n`;
  } else {
    omegaLogBuffer += `${url}:${line}:${col}:\t${message}\n\n`;
  }
};
