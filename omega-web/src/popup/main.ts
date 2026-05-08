import { createApp } from "vue";
import { createPinia } from "pinia";
import "./style.css";
import PopupApp from "./components/PopupApp.vue";

const app = createApp(PopupApp);
app.use(createPinia());
app.mount("#app");
