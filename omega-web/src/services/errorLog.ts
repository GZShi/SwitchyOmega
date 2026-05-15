const LOG_KEY = 'log';

/** Read the accumulated error log from localStorage. */
export function readErrorLog(): string {
  try {
    return localStorage[LOG_KEY] ?? '';
  } catch {
    return '';
  }
}

/** Append a message to the error log. */
export function appendErrorLog(text: string): void {
  try {
    localStorage[LOG_KEY] = (localStorage[LOG_KEY] ?? '') + text;
  } catch { /* storage unavailable */ }
}
