# Error Handling

## Type Safety

TESM provides strict type checking at compile time. When creating a state machine using `enhance()`, TypeScript verifies that:

1. All states from `Model` have corresponding handlers in `flow`
2. All handlers in `flow` correspond to existing states
3. All messages in handlers correspond to defined `Msg`

## Runtime Errors

When a message cannot be handled in the current state, TESM will throw an exception. This behavior can be modified using `onInvalidState`.

```ts
import { invalidStateMsg } from "tesm"

const machine = enhance(m, "MachineName", initial, flow, extras, {
    onInvalidState: (machine, msg, model) => {
        console.error(`Invalid state transition in ${machine}: ${model.state}.${msg.type}`);
    },
    // or use built-in error message generator
    onInvalidState: (machine, msg, model) => {
        console.error(invalidStateMsg(machine, msg, model));
    }
});
```

The `onInvalidState` handler receives:
- `machine`: State machine name (second argument of enhance)
- `msg`: Message that cannot be handled
- `model`: Current state model


## Universal Message Handlers

The `extras` parameter of the `enhance()` function allows you to define message handlers that will be called if the current state doesn't have its own handler for that message.

```ts
const machine = enhance(m, "MachineName", initial, flow, {
    some_message: (msg, model) => [
        m.states.some_state({}),
        m.cmds.some_cmd()
    ],
});
```

## Ignoring Transition

In machine there is a helper `ignore` that returns current model, so transition is simply ignored

```ts
const machine = enhance(m, "MachineName", initial, flow, {
    other_message: m.ignore,
});
```

