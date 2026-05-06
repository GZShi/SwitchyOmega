#!/usr/bin/env node
// Converts gettext .po files to Chrome extension _locales/*/messages.json format.
// Replaces: grunt-po2crx + po2json

const fs = require('fs');
const path = require('path');
const po2json = require('po2json');

const localesDir = path.join(__dirname, '..', '..', 'omega-locales');
const buildLocalesDir = path.join(__dirname, '..', 'build', '_locales');

// Chrome locale code → PO file locale directory mapping
const localeMapping = {
  'en': 'en_US',
  'zh': 'zh_CN',
  'zh_CN': 'zh_CN',
  'zh_TW': 'zh_TW',
  'zh_Hant': 'zh_Hant',
  'cs': 'cs',
  'de': 'de',
  'es': 'es',
  'es_AR': 'es_AR',
  'fa': 'fa',
  'fr': 'fr',
  'he_IL': 'he_IL',
  'id': 'id',
  'is': 'is',
  'it': 'it',
  'ja': 'ja',
  'lzh': 'lzh',
  'nb_NO': 'nb_NO',
  'nl': 'nl',
  'pl': 'pl',
  'pt': 'pt',
  'pt_BR': 'pt_BR',
  'ru': 'ru',
  'si': 'si',
  'sk': 'sk',
  'sl': 'sl',
  'tr': 'tr',
  'uk': 'uk',
  'ach': 'ach',
};

function parsePlaceholders(message) {
  const refs = [];
  let matchCount = 0;

  const result = message.replace(/\$(\d+:)?(\w+)\$/g, (_, order, ref) => {
    matchCount++;
    order = order ? parseInt(order) : matchCount;
    refs[order] = ref;
    return '$' + ref + '$';
  });

  if (!matchCount) return { message: message, placeholders: undefined };

  const placeholders = {};
  for (let i = 0; i < refs.length; i++) {
    const ph = refs[i] || '_unused_' + i;
    placeholders[ph] = { content: '$' + i };
  }

  // Handle empty string messages that are just a space
  const finalMsg = (result === ' ') ? '' : result;

  return { message: finalMsg, placeholders };
}

function convertPoToMessages(poFilePath) {
  const json = po2json.parseFileSync(poFilePath);
  const result = {};

  for (const key of Object.keys(json)) {
    if (!key) continue;
    const value = json[key];
    // po2json returns [msgid, msgstr] or just msgstr
    const message = Array.isArray(value) ? value[1] : value;
    if (message == null) continue;

    const parsed = parsePlaceholders(message);
    result[key] = {
      message: parsed.message,
    };
    if (parsed.placeholders) {
      result[key].placeholders = parsed.placeholders;
    }
  }

  return result;
}

console.log('Building locale files...');

for (const [chromeLocale, poLocale] of Object.entries(localeMapping)) {
  const poFile = path.join(localesDir, poLocale, 'LC_MESSAGES', 'omega-web.po');

  if (!fs.existsSync(poFile)) {
    console.log(`  Skipping ${chromeLocale}: PO file not found at ${poFile}`);
    continue;
  }

  const messages = convertPoToMessages(poFile);
  const destDir = path.join(buildLocalesDir, chromeLocale);
  fs.mkdirSync(destDir, { recursive: true });

  const destFile = path.join(destDir, 'messages.json');
  fs.writeFileSync(destFile, JSON.stringify(messages, null, 2));
  console.log(`  ${chromeLocale} (${poLocale}) → ${destFile}`);
}

console.log('Locale files built.');
