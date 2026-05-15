// Global error handler - captures unhandled JS errors to localStorage['log']
// Used by the About page download log button.
import { appendErrorLog } from "./errorLog";

window.onerror = (
  message: string | Event,
  url?: string,
  line?: number,
  col?: number,
  err?: Error,
): void => {
  const text = err?.stack
    ? `${err.stack}\n\n`
    : `${url}:${line}:${col}:\t${message}\n\n`;
  appendErrorLog(text);
};
