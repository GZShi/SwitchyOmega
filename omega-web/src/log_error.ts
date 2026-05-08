// Standalone error logger. Loaded by background.html to capture unhandled
// errors into localStorage for later debugging.
window.onerror = (message, url, line, col, err) => {
  let log = localStorage['log'] || '';
  if (err?.stack) {
    log += err.stack + '\n\n';
  } else {
    log += `${url}:${line}:${col}:\t${message}\n\n`;
  }
  localStorage['log'] = log;
};
