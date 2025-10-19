import { defineConfig } from 'vitepress'
import llmstxt from 'vitepress-plugin-llms'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  vite: { plugins: [llmstxt()] },
  title: "TESM",
  description: "The Elm State Machine",
  base: "/tesm/",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Docs', link: '/docs/getting-started' },
      { text: 'Home', link: '/' },
    ],

    sidebar: {
      "/docs/": [{
        text: "Tutorial",
        items: [
          { text: 'Getting Started', link: '/docs/getting-started' },
          { text: 'Side effects', link: '/docs/side-effects' },
        ]
      }, {
        text: "Examples",
        items: [
          { text: 'App Loading Flow', link: '/docs/examples/app-loading-flow' },
        ]
      }, {
        text: "Other",
        items: [
          { text: 'Error Handling', link: '/docs/other/error-handling' },
        ]
      }],

    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/zlumer/tesm' }
    ]
  }
})
