import { defineNuxtPlugin } from '#app'
import 'vue-json-pretty/lib/styles.css'

export default defineNuxtPlugin(() => {
  // CSS imported above; this plugin ensures it only loads on client
})
