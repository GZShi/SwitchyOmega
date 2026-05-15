export const getMessage: (
  key: string,
  substitutions?: string | string[],
) => string = chrome.i18n.getMessage.bind(chrome.i18n);
