import "@/services/log_error";
import { createApp } from "vue";
import { createPinia } from "pinia";
import { getMessage } from "@/services/chrome/i18n";
import App from "./App.vue";
import router from "./router";

const app = createApp(App);
app.config.globalProperties.$t = (key: string, subs?: string | string[]) =>
  getMessage(key, subs) || key;
app.use(createPinia());
app.use(router);
app.mount("#app");
