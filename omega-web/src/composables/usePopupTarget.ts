// Promise-based wrapper around OmegaTargetPopup callback-based API.
import type { OmegaTargetPopup } from '@/types/globals';

function getPopup(): OmegaTargetPopup {
  const target = window.OmegaTargetPopup;
  if (!target) {
    console.warn('OmegaTargetPopup is not available.');
  }
  return target as OmegaTargetPopup;
}

function promisify<T>(fn: (cb: (err: any, result: T) => void) => void): Promise<T> {
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
      return promisify((cb) => target.applyProfile(profileName, cb));
    },

    setDefaultProfile(profileName: string, defaultProfileName: string): Promise<void> {
      return promisify((cb) => target.setDefaultProfile(profileName, defaultProfileName, cb));
    },

    addTempRule(domain: string, profileName: string): Promise<void> {
      return promisify((cb) => target.addTempRule(domain, profileName, cb));
    },

    openOptions(hash?: string | null): Promise<void> {
      return promisify((cb) => target.openOptions(hash, cb));
    },

    openManage(): Promise<void> {
      return promisify((cb) => target.openManage(cb));
    },

    getMessage(key: string, substitutions?: string | string[]): string {
      return target.getMessage(key, substitutions);
    },
  };
}

// Re-export for convenience
export type { OmegaTargetPopup };
