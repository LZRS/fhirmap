import { createApp } from "vue";
import { createPinia } from "pinia";
import { Quasar } from 'quasar';
import App from "./App.vue";

// Import icon libraries
import '@quasar/extras/roboto-font/roboto-font.css';
import '@quasar/extras/material-icons/material-icons.css';

// Import Quasar css
import 'quasar/src/css/index.sass';

const app = createApp(App);
app.use(createPinia());
app.use(Quasar, {
    plugins: {}, // import Quasar plugins and add here
})
app.mount("#app");
