const LOG_KEY = "log";
const MAX_LOG_LENGTH = 100_000;

/** Read the accumulated error log from localStorage. */
export function readErrorLog(): string {
  try {
    return localStorage[LOG_KEY] ?? "";
  } catch {
    return "";
  }
}

/** Append a message to the error log, keeping the log under a maximum size. */
export function appendErrorLog(text: string): void {
  try {
    const current = localStorage[LOG_KEY] ?? "";
    localStorage[LOG_KEY] = (current + text).slice(-MAX_LOG_LENGTH);
  } catch {
    /* storage unavailable */
  }
}
