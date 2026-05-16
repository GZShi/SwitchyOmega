/**
 * Maps menu item element IDs to their keyboard shortcut labels.
 * Shared between PopupMenuNav (declarative rendering) and KeyboardHelp (overlay display).
 */
export const MENU_KEY_LABELS: Record<string, string> = {
  'js-direct': '0',
  'js-system': 'S',
  'js-external': 'E',
  'js-addrule': 'A',
  'js-temprule': 'T',
  'js-option': 'O',
  'js-reqinfo': 'R',
};

/** Returns the keyboard shortcut label for a profile item at the given index (1-based). */
export function getProfileKeyLabel(index: number): string {
  return String(index + 1);
}
