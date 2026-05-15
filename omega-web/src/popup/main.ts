import "@/services/log_error";
import { createApp } from "vue";
import { createPinia } from "pinia";
import { getMessage } from "@/services/chrome/i18n";
import "./style.css";
import PopupApp from "./components/PopupApp.vue";

const app = createApp(PopupApp);
app.config.globalProperties.$t = (key: string, subs?: string | string[]) =>
  getMessage(key, subs) || key;
app.use(createPinia());
app.mount("#app");
