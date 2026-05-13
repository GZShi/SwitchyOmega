// Service worker entry point for SwitchyOmega (Manifest V3).
// Module-service-worker (type: "module") — uses static import
// instead of the legacy importScripts() chain.
//
// sw.js lives in build/ while background scripts are under build/js/,
// hence the "./js/" prefix on every import.
import "./js/log_error.js";
import "./js/debug.js";
import "./js/preload.js";
import "./js/modules.mjs";
import "./js/background.js";
