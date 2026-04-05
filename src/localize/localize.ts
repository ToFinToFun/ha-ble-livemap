/**
 * ha-ble-livemap - Localization
 * Author: Jerry Paasovaara
 * License: MIT
 */

import en from "./languages/en.json";
import sv from "./languages/sv.json";

const languages: Record<string, Record<string, Record<string, string>>> = {
  en,
  sv,
};

const DEFAULT_LANG = "en";

export function localize(key: string, lang?: string): string {
  const useLang = lang && languages[lang] ? lang : DEFAULT_LANG;
  const parts = key.split(".");

  if (parts.length !== 2) return key;

  const [section, field] = parts;
  const langData = languages[useLang];

  if (langData && langData[section] && langData[section][field]) {
    return langData[section][field];
  }

  // Fallback to English
  const fallback = languages[DEFAULT_LANG];
  if (fallback && fallback[section] && fallback[section][field]) {
    return fallback[section][field];
  }

  return key;
}
