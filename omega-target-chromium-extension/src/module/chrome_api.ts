export function chromeApiPromisify(target: any, method: string) {
  return function (...args: any[]) {
    return new Promise((resolve, reject) => {
      const callback = function (...callbackArgs: any[]) {
        if (chrome.runtime.lastError != null) {
          const error: any = new Error(chrome.runtime.lastError.message);
          error.original = chrome.runtime.lastError;
          return reject(error);
        }
        if (callbackArgs.length <= 1) {
          resolve(callbackArgs[0]);
        } else {
          resolve(callbackArgs);
        }
      };

      args.push(callback);
      target[method](...args);
    });
  };
}
