import { defineConfig } from 'vitepress'
import llmstxt from 'vitepress-plugin-llms'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  vite: { plugins: [llmstxt({ stripHTML: false })] },
  title: "TESM",
  description: "The Elm State Machine",
  base: "/tesm/",

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "llms.txt", link: "/tesm/llms.txt" },
      { text: "llms-full.txt", link: "/tesm/llms-full.txt" },
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
          { text: "LLM", link: "/docs/other/llm" }
        ]
      }],

    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/zlumer/tesm' }
    ]
  }
})
