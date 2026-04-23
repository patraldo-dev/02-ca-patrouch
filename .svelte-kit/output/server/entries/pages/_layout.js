import { s as setLocale } from "../../chunks/index3.js";
async function load({ data }) {
  const initLocale = data.serverLocale || "es";
  setLocale(initLocale);
  return { ...data };
}
export {
  load
};
