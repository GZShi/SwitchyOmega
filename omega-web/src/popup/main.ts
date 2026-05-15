import "@/services/log_error";
import { createApp } from "vue";
import { createPinia } from "pinia";
import { i18nPlugin } from "@/plugins/i18n";
import "./style.css";
import PopupApp from "./components/PopupApp.vue";

const app = createApp(PopupApp);
app.use(i18nPlugin);
app.use(createPinia());
app.mount("#app");
