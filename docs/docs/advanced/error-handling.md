# Error Handling

By default, when a message cannot be handled in the current state, TESM will throw an error. However, you can customize this behavior by providing an `onInvalidState` handler in the flow options:

```ts
import { invalidStateMsg } from "tesm"

const machine = enhance(m, "MachineName", initial, flow, extras, {
    onInvalidState: (machine, msg, model) => {
        console.error(`Invalid state transition in ${machine}: ${model.state}.${msg.type}`);       
    },
    // or built in error message generator
    onInvalidState: (machine, msg, model) => console.error(invalidStateMsg(machine, msg, model))
});
```

The `onInvalidState` handler receives:
- `machine`: The name of the state machine (second argument)
- `msg`: The message that couldn't be handled
- `model`: The current state model
