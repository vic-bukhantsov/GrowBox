import { createApp } from 'vue';
import App from './App.vue';
import router from './router';  // Импортируем маршрутизатор
import './index.css'; // подключите tailwind

const app = createApp(App);

app.use(router);  // Подключаем маршрутизатор к приложению

app.mount('#app');