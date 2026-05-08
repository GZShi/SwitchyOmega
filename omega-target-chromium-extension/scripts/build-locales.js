#!/usr/bin/env node
// Converts gettext .po files to Chrome extension _locales/*/messages.json format.
// Replaces: grunt-po2crx + po2json (po2json was unmaintained; we now use gettext-parser).

const fs = require("fs");
const path = require("path");
const gettextParser = require("gettext-parser");

const localesDir = path.join(__dirname, "..", "..", "omega-locales");
const buildLocalesDir = path.join(__dirname, "..", "build", "_locales");

// Chrome locale code → PO file locale directory mapping
const localeMapping = {
  en: "en_US",
  zh: "zh_CN",
  zh_CN: "zh_CN",
  zh_TW: "zh_TW",
  zh_Hant: "zh_Hant",
  cs: "cs",
  de: "de",
  es: "es",
  es_AR: "es_AR",
  fa: "fa",
  fr: "fr",
  he_IL: "he_IL",
  id: "id",
  is: "is",
  it: "it",
  ja: "ja",
  lzh: "lzh",
  nb_NO: "nb_NO",
  nl: "nl",
  pl: "pl",
  pt: "pt",
  pt_BR: "pt_BR",
  ru: "ru",
  si: "si",
  sk: "sk",
  sl: "sl",
  tr: "tr",
  uk: "uk",
  ach: "ach",
};

function parsePlaceholders(message) {
  const refs = [];
  let matchCount = 0;

  const result = message.replace(/\$(\d+:)?(\w+)\$/g, (_, order, ref) => {
    matchCount++;
    order = order ? parseInt(order) : matchCount;
    refs[order] = ref;
    return "$" + ref + "$";
  });

  if (!matchCount) return { message: message, placeholders: undefined };

  const placeholders = {};
  for (let i = 0; i < refs.length; i++) {
    const ph = refs[i] || "_unused_" + i;
    placeholders[ph] = { content: "$" + i };
  }

  // Handle empty string messages that are just a space
  const finalMsg = result === " " ? "" : result;

  return { message: finalMsg, placeholders };
}

function convertPoToMessages(poFilePath) {
  const buf = fs.readFileSync(poFilePath);
  const parsed = gettextParser.po.parse(buf);
  const result = {};

  // gettext-parser groups translations by msgctxt. Chrome messages.json doesn't
  // use contexts, so flatten everything under a single key set. The empty
  // string context holds the top-level headers entry, which we skip.
  for (const ctx of Object.keys(parsed.translations)) {
    const entries = parsed.translations[ctx];
    for (const msgid of Object.keys(entries)) {
      if (!msgid) continue; // headers entry
      const entry = entries[msgid];
      const message = entry.msgstr && entry.msgstr[0];
      if (message == null || message === "") continue;

      const parsedMessage = parsePlaceholders(message);
      result[msgid] = {
        message: parsedMessage.message,
      };
      if (parsedMessage.placeholders) {
        result[msgid].placeholders = parsedMessage.placeholders;
      }
    }
  }

  return result;
}

console.log("Building locale files...");

for (const [chromeLocale, poLocale] of Object.entries(localeMapping)) {
  const poFile = path.join(localesDir, poLocale, "LC_MESSAGES", "omega-web.po");

  if (!fs.existsSync(poFile)) {
    console.log(`  Skipping ${chromeLocale}: PO file not found at ${poFile}`);
    continue;
  }

  const messages = convertPoToMessages(poFile);
  const destDir = path.join(buildLocalesDir, chromeLocale);
  fs.mkdirSync(destDir, { recursive: true });

  const destFile = path.join(destDir, "messages.json");
  fs.writeFileSync(destFile, JSON.stringify(messages, null, 2));
  console.log(`  ${chromeLocale} (${poLocale}) → ${destFile}`);
}

console.log("Locale files built.");
