// Promise-based wrapper around OmegaTargetPopup callback-based API.
import { OmegaTargetPopup } from "@/popup/omegaTargetPopup";

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
  return {
    getState(keys: string[]): Promise<any> {
      return promisify((cb) => OmegaTargetPopup.getState(keys, cb));
    },

    getActivePageInfo(): Promise<any> {
      return promisify((cb) => OmegaTargetPopup.getActivePageInfo(cb));
    },

    applyProfile(profileName: string): Promise<void> {
      return promisifyVoid(() => OmegaTargetPopup.applyProfile(profileName));
    },

    setDefaultProfile(
      profileName: string,
      defaultProfileName: string,
    ): Promise<void> {
      return promisifyVoid(() =>
        OmegaTargetPopup.setDefaultProfile(profileName, defaultProfileName),
      );
    },

    addTempRule(domain: string, profileName: string): Promise<void> {
      return promisifyVoid(() => OmegaTargetPopup.addTempRule(domain, profileName));
    },

    openOptions(hash?: string): Promise<void> {
      return promisifyVoid(() => OmegaTargetPopup.openOptions(hash));
    },

    openManage(): Promise<void> {
      return promisifyVoid(() => OmegaTargetPopup.openManage());
    },

    getMessage(key: string, substitutions?: string | string[]): string {
      return OmegaTargetPopup.getMessage(key, substitutions);
    },
  };
}
