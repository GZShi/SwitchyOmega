import type { App } from "vue";
import { getMessage } from "@/services/chrome/i18n";

export const i18nPlugin = {
  install(app: App) {
    app.config.globalProperties.$t = (key: string, subs?: string | string[]) =>
      getMessage(key, subs) || key;
  },
};
