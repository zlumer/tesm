# The Elm State Machine

The Elm State Machine is a state management library based on [The Elm Architecture](https://guide.elm-lang.org/architecture/).

This library makes use of concepts familiar to Elm programmers (such as Model, Msg, Cmd) to manage application state in a totally **pure** way.

TESM is written in TypeScript. While vanilla JavaScript is supported, it is highly recommended to use TypeScript for the benefit of strict type checking.

## Getting started

### State example

In this example we will develop a small state that handles a subset of the application logic.

1. Import the required components:

```typescript
import { state, cmd, msg, ExtractValues, keys, invalid_state } from "tesm"
```

---

This example state will handle logic of some loading process.
We will have **3 states**: `initial`, `loading` and `loaded`.

Every **state** has a **context** where all the data is stored. Context is basically a plain JS object that stores fields with data.

2. Let's create **2 context types** for when the loading process has just started and when the loading process has completed.

```typescript
type LoadingContext = {
    loadingStarted: number
}
type AppContext = LoadingContext & {
    loadingFinished: number
}
```

`loadingStarted` is the time when loading has started. `loadingFinished` is the time when loading has finished.

---

Now we can create states with attached contexts.

3. Let's create our states by using an imported **`state()`** function.

```typescript
const states = state({
    initial: () => ({}),
    loading: <T extends LoadingContext>(m: T) => m,
    loaded: <T extends AppContext>(m: T) => m,
})
```
We pass an object to **`state()`** where the field names are state names and values are functions that serve as a strictly typed boilerplate.

Next, we need a way to change the underlying state. Let's define *incoming and outgoing messages* that are related to our state.

---

Incoming messages are called **`Msg`** in Elm world.  
The only requirement for `Msg` in TESM is to have a `type` field. `Msg` can have extra fields with data.

You can think of `Msg` as events that happen in outside world and are passed to TESM state with related data.

4. Let's create a couple of `Msg`.

```typescript
export const msgs = msg({
    started_loading: (now: number) => ({ now }),
    finished_loading: (now: number) => ({ now }),
})
```
`msgs` should be exported from the state module because they are generated by outside code.

**`msg()`** function works similar to **`state()`**: we pass to it an object with `Msg` names and generator functions.

The convention for `Msg` names is `snake_case` and past tense verbs. These are the events that already happened and our state is being notified of them.  
`APPLICATION_LOADED`, `http_error_encountered` and `user.loading.failed` are all good names for `Msg`.

---

Outgoing messages are called **`Cmd`**.

5. Let's create a couple of `Cmd`.

```typescript
const cmds = cmd({
    startLoadingAnimation: () => ({ }),
    displayPopup: (text: string) => ({ text }),
})
```
`cmds` don't have to be exported, we will create them internally in the state module.

`Cmd` are almost identical to `Msg`, the only difference being the naming convention: `Cmd` names are `camelCase` and use present tense verbs. You should name `Cmd` the same way you name methods in your code.  
`loadUserInfo(uid: string)`, `todo.create(name: string)` and `cancelLoading` are all good names for `Cmd`.

---

6. Let's extract types from our objects for future use.

```typescript
export type Msg = ExtractValues<typeof msgs>
export type Cmd = ExtractValues<typeof cmds>
export type Model = ExtractValues<typeof states>
```

---

7. We can also export initial state. We will need it later when we get to interaction between TESM states and outside world.

```typescript
export const initialState = states.initial
```

---

It's time for us to create the core of our logic: the **`update()`** function.  
This function will take care of all incoming messages and will update the state accordingly.

The signature of the `update()` function is as follows:
```typescript
export function update(msg: Msg, model: Model): [Model, ...Cmd[]]
```

If you're familiar with Elm, this function looks almost the same as Elm update function:
```elm
update : Msg -> Model -> (Model, Cmd Msg)
```
The differences are that TESM `update()` can return multiple `Cmd` if needed, and `Cmd` are not tied to `Msg`.

For convenience we will use constants instead of state and `Msg` names, but you can use strings if you prefer to.

```typescript
const STATE = keys(states)
const MSG = keys(msgs)

export function update(msg: Msg, model: Model): [Model, ...Cmd[]]
{
    return invalid_state("MainState", msg, model)
}
```

8. Let's add some logic to the `update()` function.

```typescript
export function update(msg: Msg, model: Model): [Model, ...Cmd[]]
{
    switch (model.state)
    {
        // case "initial":
        case STATE.initial: switch (msg.type)
        {
            // case "started_loading":
            case MSG.started_loading:
                return [
                    states.loading({ loadingStarted: msg.now}),
                    cmds.startLoadingAnimation()
                ]
        }
        break
        case STATE.loading: switch (msg.type)
        {
            case MSG.finished_loading:
                return [
                    states.loaded({
                        loadingStarted: model.loadingStarted,
                        loadingFinished: msg.now,
                    }),
                    cmds.displayPopup(`Loading finished in ${msg.now - model.loadingStarted} milliseconds!`)
                ]
        }
        break
    }
    return invalid_state("MainState", msg, model)
}
```

We're using [pattern matching](https://stackoverflow.com/questions/2502354/what-is-pattern-matching-in-functional-languages) to process incoming messages based on their types and current state type.

In this example case we throw an error if current state cannot handle the message. You can choose to not throw an error and ignore the message instead, or handle all types of messages in all kinds of states.

---

Let's focus on the return value in this part of the code:
```typescript
return [
    states.loading({ loadingStarted: msg.now}),
    cmds.startLoadingAnimation()
]
```

First element of the array is the updated state. States should always be immutable and it's up to you to make sure that none of the fields of the states are ever changed. Use [spread syntax](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax) where applicable.  
We use state constructors that were defined in step 3 of this tutorial. TypeScript checks that all of the required parameters were passed to the state context and ensures type safety.

Second element of the array (and also third and fourth and so on) is the *side effect* that is produced by this combination of state and `Msg`. In the provided example we instruct the outer world to start loading animation. It is important to note that the state itself *never starts* any of the side-effects: no timers, no HTTP requests, no DOM operations etc.  
Our state only instructs the outer world to run these side effects. The exact way to perform side effects is decided by the outer world.  
In the real application we can handle `startLoadingAnimation` by displaying an animation on the webpage.  
In the tests, however, we can just skip this side effect and proceed with other messages.


Let's take a look at the full code of the example before proceeding to the *outer world* implementation of our state.


### Complete code of the state example

```typescript
import { state, cmd, msg, ExtractValues, keys, invalid_state } from "tesm"

type LoadingContext = {
    loadingStarted: number
}
type AppContext = LoadingContext & {
    loadingFinished: number
}

const states = state({
    initial: () => ({}),
    loading: <T extends LoadingContext>(m: T) => m,
    loaded: <T extends AppContext>(m: T) => m,
})

export const msgs = msg({
    started_loading: (now: number) => ({ now }),
    finished_loading: (now: number) => ({ now }),
})

const cmds = cmd({
    startLoadingAnimation: () => ({ }),
    displayPopup: (text: string) => ({ text }),
})

export type Msg = ExtractValues<typeof msgs>
export type Cmd = ExtractValues<typeof cmds>
export type Model = ExtractValues<typeof states>

export const initialState = states.initial

const STATE = keys(states)
const MSG = keys(msgs)

export function update(msg: Msg, model: Model): [Model, ...Cmd[]]
{
    switch (model.state)
    {
        case STATE.initial: switch (msg.type)
        {
            case MSG.started_loading:
                return [
                    states.loading({ loadingStarted: msg.now}),
                    cmds.startLoadingAnimation()
                ]
        }
        break
        case STATE.loading: switch (msg.type)
        {
            case MSG.finished_loading:
                return [
                    states.loaded({
                        loadingStarted: model.loadingStarted,
                        loadingFinished: msg.now,
                    }),
                    cmds.displayPopup(`Loading finished in ${msg.now - model.loadingStarted} milliseconds!`)
                ]
        }
        break
    }
    return invalid_state("MainState", msg, model)
}
```

### Outer world

So far we've been writing our state in full isolation: we have **states**, **Msg**, **Cmd** and the application logic inside **update()**, but it's just a bunch of pure functions and raw data.  
In this section of the tutorial we get to the interesting part: integrating this pure state to the real world application full of side effects and asynchronicity.

**`React/Vue examples TBD`**

#### Node.js implementation

For convenience we can use a **hook** (not to be confused with React Hooks): an object that maintains current state and updates it when new `Msg` arrive.  
TESM comes with a couple of implementations of hooks, we will use the simplest one of them called `createHook()`.

1. Import `createHook()` and our state.

```typescript
import { createHook } from "tesm"
import { update, initialState, msgs } from "./state"
```

2. Create an instance of hook by providing it with an `update()` function of our state and with a function that returns initial state.

```typescript
let hook = createHook(update)(initialState)
```

Now we have an object that encapsulates our application state inside itself and handles side effects.

3. Add a side effect handler to the current state.

```typescript
hook.addHandler(cmd =>
{
    switch (cmd.type)
    {
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
import { update, initialState, msgs } from "./state"

let hook = createHook(update)(initialState)
hook.addHandler(cmd =>
{
    switch (cmd.type)
    {
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

If you use object-oriented programming in your code and don't want to use pattern matching (switch/case) in side effect handlers, you can use `ClassInterface<Cmd>` and `callClass<Cmd>()` helpers:

```typescript
class ConsoleLogger implements ClassInterface<Cmd>
{
	startLoadingAnimation()
	{
		console.log(`loading animation started...`)
	}
	displayPopup(cmd: { text: string })
	{
		console.log(`displaying popup with text "${cmd.text}"`)
	}
}

let hook = createHook(update)(initialState)

let logger = new ConsoleLogger()
let handler = callClass<Cmd>(logger)
hook.addHandler(cmd => handler(cmd))

hook.send(msgs.started_loading(Date.now()))
// loading animation started...
```

You can even make use of the existing code if you name your `Cmd` identical to existing methods on your handler classes and pass the same parameters.
