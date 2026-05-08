export function useOmegaPac(): typeof OmegaPac {
  if (!window.OmegaPac) {
    console.warn('OmegaPac is not available. Running in dev mode without extension context.');
    // Return a stub in dev mode
    return {} as typeof OmegaPac;
  }
  return window.OmegaPac;
}
