import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "TESM",
  description: "The Elm State Machine",
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
      },]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/zlumer/tesm' }
    ]
  }
})
