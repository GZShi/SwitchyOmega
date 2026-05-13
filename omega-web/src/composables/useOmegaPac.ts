// omega-pac is a workspace dependency. Vite resolves it and tree-shakes
// the bundle so the options page only ships what it actually imports.
import * as OmegaPac from "omega-pac";

export function useOmegaPac(): typeof OmegaPac {
  return OmegaPac;
}
