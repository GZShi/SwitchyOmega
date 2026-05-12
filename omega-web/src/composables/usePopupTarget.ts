// Promise-based wrapper around OmegaTargetPopup callback-based API.
import type { OmegaTargetPopup } from "@/types/globals";

function getPopup(): OmegaTargetPopup {
  const target = window.OmegaTargetPopup;
  if (!target) {
    console.warn("OmegaTargetPopup is not available.");
  }
  return target as OmegaTargetPopup;
}

function promisify<T>(fn: (cb: (...args: any[]) => void) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    fn((err: any, result: T) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

function promisifyVoid(fn: (cb: () => void) => void): Promise<void> {
  return new Promise((resolve) => {
    fn(() => resolve());
  });
}

export function usePopupTarget() {
  const target = getPopup();

  return {
    getState(keys: string[]): Promise<any> {
      return promisify((cb) => target.getState(keys, cb));
    },

    getActivePageInfo(): Promise<any> {
      return promisify((cb) => target.getActivePageInfo(cb));
    },

    applyProfile(profileName: string): Promise<void> {
      return promisifyVoid(() => target.applyProfile(profileName));
    },

    setDefaultProfile(
      profileName: string,
      defaultProfileName: string,
    ): Promise<void> {
      return promisifyVoid(() =>
        target.setDefaultProfile(profileName, defaultProfileName),
      );
    },

    addTempRule(domain: string, profileName: string): Promise<void> {
      return promisifyVoid(() => target.addTempRule(domain, profileName));
    },

    openOptions(hash?: string): Promise<void> {
      return promisifyVoid(() => target.openOptions(hash));
    },

    openManage(): Promise<void> {
      return promisifyVoid(() => target.openManage());
    },

    getMessage(key: string, substitutions?: string | string[]): string {
      return target.getMessage(key, substitutions);
    },
  };
}

// Re-export for convenience
export type { OmegaTargetPopup };
