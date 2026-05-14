// Service worker entry point for SwitchyOmega (Manifest V3).
// Module-service-worker (type: "module") — uses static import
// instead of the legacy importScripts() chain.
//
// sw.js lives in build/ while background scripts are under build/js/background/,
// hence the "./js/background/" prefix on those imports.
import "./js/background/log-error.js";
import "./js/background/debug.js";
import "./js/background/preload.js";
import "./js/modules.mjs";
import "./js/background/background.js";
