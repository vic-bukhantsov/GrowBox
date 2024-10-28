<template>

  <!-- Main content -->
  <main class="mt-10">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="bg-white shadow rounded-lg p-6">
        <!-- Hero section -->
        <div class="lg:flex lg:items-center lg:justify-between">
          <div class="lg:w-1/2">
            <h2 class="text-4xl font-bold text-gray-900 mb-4">Welcome to Tailwind CSS</h2>
            <p class="text-lg text-gray-600 mb-6">
              Tailwind CSS makes it easy to create beautiful, responsive designs without writing custom CSS. You can easily build your components using utility classes.
            </p>
            <a href="#" class="inline-block bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
              Get Started
            </a>
          </div>
          <div class="lg:w-1/2 mt-6 lg:mt-0 lg:flex lg:justify-center">
            <img src="https://via.placeholder.com/400x300" alt="Example Image" class="rounded-lg shadow">
          </div>
        </div>
      </div>


        <router-view></router-view>

      <!-- Features section -->
      <div class="mt-10">
        <h3 class="text-2xl font-bold mb-4">Why Tailwind?</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div class="bg-white shadow-lg rounded-lg p-6">
            <h4 class="text-xl font-bold mb-2">Utility-First</h4>
            <p class="text-gray-600">Tailwind CSS is designed to be a utility-first framework, allowing you to build complex layouts with ease.</p>
          </div>
          <div class="bg-white shadow-lg rounded-lg p-6">
            <h4 class="text-xl font-bold mb-2">Responsive</h4>
            <p class="text-gray-600">Easily build responsive layouts that adapt to different screen sizes and devices.</p>
          </div>
          <div class="bg-white shadow-lg rounded-lg p-6">
            <h4 class="text-xl font-bold mb-2">Customizable</h4>
            <p class="text-gray-600">Tailwind is highly customizable and can be easily extended with your own design system.</p>
          </div>
        </div>
      </div>
    </div>
  </main>

  <!-- Footer -->
  <footer class="bg-gray-800 mt-10 py-6">
    <div class="max-w-7xl mx-auto text-center text-white">
      <p>&copy; 2024 My Tailwind Page. All rights reserved.</p>
    </div>
  </footer>
</template>

<script>
export default {
  name: 'App'
};
</script>

<style>
/* Стили для корневого компонента */
</style>