---
title: Side effects
description: Quick guide to TESM
---

# Side effects

So far we've been writing our state in full isolation: we have **states**, **Msg**, **Cmd** and the transition logic inside **defineFlow()**, but it's just a bunch of pure functions and raw data.  
In this section of the tutorial we get to the interesting part: integrating this pure state to the real world application full of side effects and asynchronicity.

## React

For react, TESM comes with **`useTeaSimple`** hook

1. Let's import our state and hook

```ts
import { LoadingState } from "./state"
import { useTeaSimple } from "tesm/react"
```

2. The hook accepts two arguments:

-   The state machine definition
-   An object with side-effect handlers

```tsx
function App() {
	const [model, msgs] = useTeaSimple(LoadingState, {
		displayPopup: ({ text }, msgs) => {
			alert(text)
		},
		startLoadingAnimation: (cmd, msgs) => {},
	})

	return (
		<div>
			<button
				disabled={model.state === "loading"}
				onClick={() => msgs.started_loading(Date.now())}
			>
				start load
			</button>
			<button
				disabled={model.state !== "loading"}
				onClick={() => msgs.finished_loading(Date.now())}
			>
				finish load
			</button>
		</div>
	)
}

export default App
```

## Separate Cmd Handler

You can create command handlers separately from the hook using `createHandler()` function. 
>`createHandler()` requires machine's type (return type of `machine()` or `defineFlow()`)

```ts
import { createHandler } from "tesm"
import { LoadingState } from "./state"

// Create handler separately
const cmdHandler = createHandler<typeof LoadingState>({
	displayPopup: ({ text }, msgs) => {
		alert(text)
	},
	startLoadingAnimation: (cmd, msgs) => {
		// Start loading animation logic		
	},
})

function App() {
	// Pass the pre-created handler to the hook
	const [model, msgs] = useTeaSimple(LoadingState, cmdHandler)
	
	// ... rest of component
}
```
Even more flexibility can be achieved with the `createHandlerF()` function. It accepts a function with parameters that can be passed through in the component.

```ts
import { createHandlerF } from "tesm"
import { LoadingState } from "./state"

// Create handler with external "alert"  
const cmdHandlerF = createHandlerF<typeof LoadingState, { alert: (s: string) => void }>(({ alert }) => ({
	displayPopup: ({ text }, msgs) => {
		alert(text)
	},
	startLoadingAnimation: (cmd, msgs) => {

	},
}))

function App() {
	// Pass the pre-created handler to the hook
	const [model, msgs] = useTeaSimple(LoadingState, cmdHandlerF({ alert: window.alert }))
	
	// ... rest of component
}
```

This approach is useful when:
- You want to keep your component code cleaner by extracting side-effect logic
- You need to test command handlers separately
- You need to compose state machines in a hierarchy, where one machine's command handler can receive another machine's command handler

## Node.js

For convenience we can use a **hook** (not to be confused with React Hooks): an object that maintains current state and updates it when new `Msg` arrive.  
TESM comes with a hook called `createHook()`.

1. Import `createHook()` and our state.

```typescript
import { createHook } from "tesm"
// destructured from `LoadingState`
import { msgs, state, update, initial } from "./state"
```

2. Create an instance of hook by providing it with an `update()` function of our state and with a function that returns initial state.

```typescript
let hook = createHook(update)(initial)
```

3. Add a side effect handler to the current state.

```typescript
hook.addHandler((cmd) => {
	switch (cmd.type) {
		case "startLoadingAnimation":
			return console.log(`loading animation started`)
		case "displayPopup":
			return console.log(`displaying popup with text "${cmd.text}"`)
	}
})
```

For the purpose of this example we will just log our side effects into console. In the real world scenario we could update DOM, send HTTP requests, perform other async actions etc.

Sending new messages (`Msg`) to the state is simple:

```typescript
hook.send(msgs.started_loading(Date.now()))
```

You can construct an object manually if you want to, but it's always easier to use `Msg` constructors.

Manual mode:

```typescript
hook.send({ type: "started_loading", now: Date.now() })
```

Let's take a look at the full example:

```typescript
import { createHook } from "tesm"
import { msgs, state, update, initial } from "./state"

let hook = createHook(update)(initial)
hook.addHandler((cmd) => {
	switch (cmd.type) {
		case "startLoadingAnimation":
			return console.log(`loading animation started`)
		case "displayPopup":
			return console.log(`displaying popup with text "${cmd.text}"`)
	}
})

console.log(hook.getState())
// { state: 'initial' }

hook.send(msgs.started_loading(Date.now()))
// loading animation started

console.log(hook.getState())
// { state: 'loading', loadingStarted: 1582582297994 }

hook.send(msgs.finished_loading(Date.now()))
// displaying popup with text "Loading finished in 2 milliseconds!"

console.log(hook.getState())
// { state: 'loaded', loadingStarted: 1582582297994, loadingFinished: 1582582297996 }
```
