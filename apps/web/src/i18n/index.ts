import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { resources } from "./resources";

void i18n.use(initReactI18next).init({
  resources,
  lng: window.localStorage.getItem("promptdesk.language") ?? "pt-BR",
  fallbackLng: "pt-BR",
  interpolation: {
    escapeValue: false
  }
});

export { i18n };
