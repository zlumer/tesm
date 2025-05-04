---
title: Getting Started
description: Quick guide to TESM
---

# Getting Started

The Elm State Machine is a state management library based on [The Elm Architecture](https://guide.elm-lang.org/architecture/).

This library makes use of concepts familiar to Elm programmers (such as Model, Msg, Cmd) to manage application state in a totally **pure** way.

TESM is written in TypeScript. While vanilla JavaScript is supported, it is highly recommended to use TypeScript for the benefit of strict type checking.

## Installation

::: code-group

```sh [npm]
npm install tesm
```

```sh [yarn]
yarn add tesm
```

:::

## Example

In this example we will develop a small state that handles a subset of the application logic.

1. Import the required components:

```ts
import { machine, stateType, XMsg, XModel, XCmd, enhance } from "tesm"
```

---

This example state will handle logic of some loading process.
We will have **3 states**: `initial`, `loading` and `loaded`.

Every **state** has a **context** where all the data is stored. Context is basically a plain JS object that stores fields with data.

2. Let's create **2 context types** for when the loading process has just started and when the loading process has completed.

```ts
type LoadingContext = {
	loadingStarted: number
}
type AppContext = LoadingContext & {
	loadingFinished: number
}
```

`loadingStarted` is the time when loading has started. `loadingFinished` is the time when loading has finished.

---

Now we can create state machine

3. Let's create our states.

```ts
const m = machine(
	{
		initial: () => ({}),
		loading: <T extends LoadingContext>(m: T) => m,
		loaded: <T extends AppContext>(m: T) => m,
	},
	{},
	{}
)
```

to less boilerplate use an imported **`stateType()`** function

```ts
const m = machine(
	{
		initial: () => ({}),
		loading: stateType<LoadingContext>(),
		loaded: stateType<AppContext>(),
	},
	{},
	{}
)
```

We pass an object as `machine` first argument where the field names are state names and values are functions that serve as a strictly typed boilerplate.

Next, we need a way to change the underlying state. Let's define _incoming and outgoing messages_ that are related to our state.

---

Incoming messages are called **`Msg`** in Elm world.  
The only requirement for `Msg` in TESM is to have a `type` field. `Msg` can have extra fields with data.

You can think of `Msg` as events that happen in outside world and are passed to TESM state with related data.

4. Let's create a couple of `Msg`.

```ts
const m = machine(
	{
		// our states
	},
	{
		started_loading: (now: number) => ({ now }),
		finished_loading: (now: number) => ({ now }),
	},
	{}
)
```

msg structure is similar to state: we pass as `machine` second argument an object with `Msg` names and generator functions.

The convention for `Msg` names is `snake_case` and past tense verbs. These are the events that already happened and our state is being notified of them.
`APPLICATION_LOADED`, `http_error_encountered` and `user.loading.failed` are all good names for `Msg`.

---

5. Let's create a couple of `Cmd`.

```ts
const m = machine(
	{
		// our states
	},
	{
		// our msgs
	},
	{
		startLoadingAnimation: () => ({}),
		displayPopup: (text: string) => ({ text }),
	}
)
```

`Cmd` are almost identical to `Msg`, the only difference being the naming convention: `Cmd` names are `camelCase` and use present tense verbs. You should name `Cmd` the same way you name methods in your code.  
`loadUserInfo(uid: string)`, `todo.create(name: string)` and `cancelLoading` are all good names for `Cmd`.

---

6. Let's extract types from our objects for future use.

```ts
export type Msg = XMsg<typeof m>
export type Cmd = XCmd<typeof m>
export type Model = XModel<typeof m>
```

---

It's time for us to create the core of our logic: the **`update()`** function.  
This function will take care of all incoming messages and will update the state accordingly.

The signature of the `update()` function is as follows:

```ts
export function update(msg: Msg, model: Model): [Model, ...Cmd[]]
```

If you're familiar with Elm, this function looks almost the same as Elm update function:

```elm
update : Msg -> Model -> (Model, Cmd Msg)
```

The differences are that TESM `update()` can return multiple `Cmd` if needed, and `Cmd` are not tied to `Msg`

Since we're using a state machine, we need to define state transition logic rather than one update function.

transition logic is an object with following syntax:

```ts
{
   <state_from>: {
    <incoming_msg>: (msg, model) => [
      <new_state>,
      <...cmds>
    ]
  }
}
```

Let's create our state transition logic by passing the object to the **`enhance()`** function as its 4th argument.

Try use autocomplete between curly braces and it will suggest the initial state and messages to you.

```ts
export const LoadingState = enhance(
	m, // our machine
	"LoadingState", // machine name for debug
	() => [m.states.initial({})], // initial state and cmds if you want
	{
		initial: {
			started_loading: (msg, model) => [
				m.states.loading({ loadingStarted: msg.now }),
				m.cmds.startLoadingAnimation(),
			],
		},
		loading: {
			finished_loading: (msg, model) => [
				m.states.loaded({
					loadingStarted: model.loadingStarted,
					loadingFinished: msg.now,
				}),
				m.cmds.displayPopup(
					`Loading finished in ${msg.now - model.loadingStarted} milliseconds!`
				),
			],
		},
	}
)
```

We're using [pattern matching](https://stackoverflow.com/questions/2502354/what-is-pattern-matching-in-functional-languages) to process incoming messages based on their types and current state type.

The `enhance` function will throw an error if current state cannot handle the message.

---

Let's focus on the return value in this part of the code:

```typescript
[
    m.states.loading({ loadingStarted: msg.now }),
    m.cmds.startLoadingAnimation(),
],
```

First element of the array is the updated state. States should always be immutable and it's up to you to make sure that none of the fields of the states are ever changed. Use [spread syntax](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax) where applicable.  
Based on the state definitions from step 3 of this tutorial. TypeScript checks that all of the required parameters were passed to the state context and ensures type safety

Second element of the array (and also third and fourth and so on) is the _side effect_ that is produced by this combination of state and `Msg`. In the provided example we instruct the outer world to start loading animation. It is important to note that the state itself _never starts_ any of the side-effects: no timers, no HTTP requests, no DOM operations etc.  
Our state only instructs the outer world to run these side effects. The exact way to perform side effects is decided by the outer world.  
In the real application we can handle `startLoadingAnimation` by displaying an animation on the webpage.  
In the tests, however, we can just skip this side effect and proceed with other messages.

Let's take a look at the full code of the example before proceeding to the _outer world_ implementation of our state.

## Complete code of the example

```ts
import { machine, stateType, XMsg, XModel, XCmd, enhance } from "tesm"

type LoadingContext = {
	loadingStarted: number
}
type AppContext = LoadingContext & {
	loadingFinished: number
}

const m = machine(
	{
		initial: stateType(),
		loading: stateType<LoadingContext>(),
		loaded: stateType<AppContext>(),
	},
	{
		started_loading: (now: number) => ({ now }),
		finished_loading: (now: number) => ({ now }),
	},
	{
		startLoadingAnimation: () => ({}),
		displayPopup: (text: string) => ({ text }),
	}
)

export type Msg = XMsg<typeof m>
export type Cmd = XCmd<typeof m>
export type Model = XModel<typeof m>

export const LoadingState = enhance(m, "LoadingState", () => [m.states.initial({})], {
	initial: {
		started_loading: (msg, model) => [
			m.states.loading({ loadingStarted: msg.now }),
			m.cmds.startLoadingAnimation(),
		],
	},
	loading: {
		finished_loading: (msg, model) => [
			m.states.loaded({
				loadingStarted: model.loadingStarted,
				loadingFinished: msg.now,
			}),
			m.cmds.displayPopup(
				`Loading finished in ${msg.now - model.loadingStarted} milliseconds!`
			),
		],
	},
})
```
