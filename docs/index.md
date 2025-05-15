---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
    name: "TESM"
    text: "The Elm State Machine"
    tagline: Expressive, concise and robust state management for typescript ecosystem
    actions:
        - theme: brand
          text: Quickstart
          link: /docs/getting-started

features:
    - icon: 🛡️
      title: Type Safety
      details: Use reliable and expressive typescript constructs to build your app state
    - icon: ⚙️
      title: Framework agnostic
      details: Universal state management for any JS/TS tool
    - icon: 🧠
      title: Elm Architecture
      details: Use concepts from The Elm Architecture (Model, Msg, Cmd). Manage application state in a totally pure way
---

## Simple App Loading Flow Example

[View full example](/docs/examples/app-loading-flow)

<<< @/../src/examples/app-loading/state.ts#example
