import "@/services/log_error";
import { createApp } from "vue";
import { createPinia } from "pinia";
import { i18nPlugin } from "@/plugins/i18n";
import App from "./App.vue";
import router from "./router";

const app = createApp(App);
app.use(i18nPlugin);
app.use(createPinia());
app.use(router);
app.mount("#app");
