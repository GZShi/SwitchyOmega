const replacer = (key: string, value: unknown): unknown => {
  switch (key) {
    case "username":
    case "password":
    case "host":
    case "port":
      return "<secret>";
    default:
      return value;
  }
};

export function str(obj: unknown): string {
  if (obj === null || typeof obj !== "object") {
    if (typeof obj === "function") {
      return obj.name ? `<f: ${obj.name}>` : obj.toString();
    }
    return String(obj);
  }
  const maybeWithDebug = obj as { debugStr?: string | (() => string) };
  if (maybeWithDebug.debugStr != null) {
    return typeof maybeWithDebug.debugStr === "function"
      ? maybeWithDebug.debugStr()
      : maybeWithDebug.debugStr;
  }
  if (obj instanceof Error) {
    return obj.stack ?? obj.message;
  }
  return JSON.stringify(obj, replacer, 4);
}

export const log: (...args: unknown[]) => void = console.log.bind(console);
export const error: (...args: unknown[]) => void = console.error.bind(console);

export function func(name: string, args: ArrayLike<unknown>): void {
  log(name, "(", Array.from(args), ")");
}

export function method(
  name: string,
  self: unknown,
  args: ArrayLike<unknown>,
): void {
  log(str(self), "<<", name, Array.from(args));
}

const Log = { str, log, error, func, method };
export default Log;
