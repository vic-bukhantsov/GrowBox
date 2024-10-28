module.exports = {
  // Устанавливает базовый URL для приложения (по умолчанию '/')
  publicPath: process.env.NODE_ENV === 'production' ? '/my-app/' : '/',

  // Определяет выходную директорию для собранных файлов
  outputDir: '../data/',

  // Определяет директорию для статических ресурсов
  assetsDir: 's',

  // Отключает генерацию source maps для production-сборки
  productionSourceMap: false,

  // Настройки для dev-сервера
  devServer: {
    port: 8080, // Устанавливает порт для локального сервера
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // Проксирование запросов на сервер API
        changeOrigin: true
      }
    }
  },

  // Настройки для компиляции с использованием Webpack
  configureWebpack: {
    // Настройки Webpack
  },

  // Линтинг и форматирование кода во время сохранения
  lintOnSave: process.env.NODE_ENV !== 'production',

  // Настройки для использования плагинов
  pluginOptions: {
    // Например, плагин для Vuetify
    vuetify: {
      // Настройки плагина
    }
  }
};