import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
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
          { text: 'Traffic light', link: '/docs/examples/traffic-light' },
          { text: 'Auth flow', link: '/docs/examples/auth-flow' },
        ]
      }],

    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/zlumer/tesm' }
    ]
  }
})
