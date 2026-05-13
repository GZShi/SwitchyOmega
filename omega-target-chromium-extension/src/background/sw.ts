// Service worker entry point for SwitchyOmega (Manifest V3).
// Uses importScripts to load all dependencies in the correct order,
// replicating what background.html did in Manifest V2.

declare function importScripts(...urls: string[]): void;

var omegaLogBuffer = "";
var omegaLogLastError = "";

try {
  importScripts(
    "js/log_error.js",
    "js/debug.js",
    "js/preload.js",
    "js/omega_pac.min.js",
    "js/omega_target.min.js",
    "js/omega_target_chromium_extension.min.js",
    "img/icons/draw_omega.js",
    "js/background.js",
  );
} catch (e) {
  console.error("SwitchyOmega service worker failed to load:", e);
}
