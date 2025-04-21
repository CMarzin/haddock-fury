// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: ['@nuxt/ui'],
  compatibilityDate: '2025-04-09',
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      script: [
        {
          'data-domain': 'haddock-fury.cocommit.fr',
          'src': 'https://plausible.cocommit.fr/js/script.js',
        }
      ]
    }
  }
})