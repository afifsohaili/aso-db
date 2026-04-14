import tailwindcss from '@tailwindcss/vite'
import Icons from 'unplugin-icons/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  modules: [
    '@vueuse/nuxt',
    ['unplugin-icons/nuxt', {}],
    '@nuxt/test-utils/module',
  ],
  components: [
    { path: '~/components', pathPrefix: false },
  ],
  vite: {
    plugins: [
      Icons(),
      tailwindcss(),
    ],
  },
  runtimeConfig: {
    databaseUrl: '', // Server-only, set via NUXT_DATABASE_URL env var
  },
  nitro: {
    preset: 'node-server',
    experimental: {
      database: true,
    },
  },
  compatibilityDate: '2025-05-14',
})