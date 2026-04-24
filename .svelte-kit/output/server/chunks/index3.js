import { d as derived, w as writable } from "./index2.js";
import { f as fr, e as es, a as en } from "./fr.js";
const translations = { en, es, fr };
const locale = writable("es");
const locales = ["en", "es", "fr"];
const t = derived(locale, ($locale) => {
  return (key) => {
    let translation = translations[$locale]?.[key];
    if (!translation) {
      translation = translations[$locale]?.[key.toLowerCase()];
    }
    return translation || key;
  };
});
function setLocale(newLocale) {
  if (locales.includes(newLocale)) {
    locale.set(newLocale);
  }
}
function getLocale() {
  let currentLocale;
  locale.subscribe((value) => currentLocale = value)();
  return currentLocale;
}
export {
  getLocale as g,
  locale as l,
  setLocale as s,
  t
};
