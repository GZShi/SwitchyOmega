import type { OmegaTargetWeb, OmegaTargetPopup } from '@/types/globals';

function getOmegaTarget(): OmegaTargetWeb | OmegaTargetPopup {
  const target = window.omegaTarget ?? window.OmegaTargetPopup;
  if (!target) {
    console.warn('omegaTarget is not available. Running in dev mode without extension context.');
  }
  return target as OmegaTargetWeb | OmegaTargetPopup;
}

export function useOmegaTarget(): OmegaTargetWeb {
  return getOmegaTarget() as OmegaTargetWeb;
}

export function useOmegaTargetPopup(): OmegaTargetPopup {
  return getOmegaTarget() as OmegaTargetPopup;
}
