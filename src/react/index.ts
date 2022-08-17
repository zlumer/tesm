import { useState, useEffect } from 'react'

export function useTesmSync<Model, Msg, Cmd>(
    update: (msg: Msg, model: Model) => readonly [Model, ...Cmd[]],
    initial: () => readonly [Model, ...Cmd[]],
    effectHandler: (cmd: Cmd, send: (msg: Msg) => void) => void
): [Model, (msg: Msg) => void, () => void] {
    const [state, setState] = useState(() => initial())
    const send = (msg: Msg) => setState((s) => update(msg, s[0]))
    const reset = () => setState(() => initial())

    useEffect(() => {
        const [model, ...cmds] = state
        if (cmds.length) {
            /*
              важно, чтобы этот setState был над циклом, 
              потому что в effectHandler может синхронно стригериться send 
              и тогда этот setState и setState в send объединятся в батч 
              и в итоге модель возьмется из последнего setState
            */
            setState([model]) 
            for (let cmd of cmds) effectHandler(cmd, send)
        }
    }, [state])

    return [state[0], send, reset]
}
export function useTesmEasy<Model, Msg, Cmd, MsgCreator>(
    machine: {
        update: (msg: Msg, model: Model) => readonly [Model, ...Cmd[]]
        initial: () => readonly [Model, ...Cmd[]]
        msgCreator: (send: (msg: Msg) => void) => MsgCreator
    },
    effectHandler: (cmd: Cmd, send: (msg: Msg) => void) => void
) {
    return useTesmWithCreator(
        machine.update,
        machine.initial,
        effectHandler,
        machine.msgCreator
    )
}
export function useTesmWithCreator<Model, Msg, Cmd, MsgCreator>(
    update: (msg: Msg, model: Model) => readonly [Model, ...Cmd[]],
    initial: () => readonly [Model, ...Cmd[]],
    effectHandler: (cmd: Cmd, send: (msg: Msg) => void) => void,
    msgCreator: (send: (msg: Msg) => void) => MsgCreator
): [Model, MsgCreator, () => void] {
    const [model, send, reset] = useTesmSync(update, initial, effectHandler)
    return [model, msgCreator(send), reset]
}
