// Mutable log state shared across service worker modules.
// Stored on `self` (the SW global scope) to avoid ES module import
// read-only binding semantics.  All modules read / write via the
// same `self.__omegaLogState` reference.
const key = "__omegaLogState";

if (!(self as any)[key]) {
  (self as any)[key] = { buffer: "", lastError: "" };
}

export const logState: { buffer: string; lastError: string } = (self as any)[key];
