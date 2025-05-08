const createHookRaw = <
    Model extends { state: string },
    Msg extends { type: string },
    Cmd extends { type: string }
>(
    update: (msg: Msg, model: Model) => readonly [Model, ...Cmd[]]
) =>
    (initialState: Model, keepHistory = -1) => {
        let state = initialState
        let history: [Model, Msg, Model, ...Cmd[]][] = []
        function sendMsg(msg: Msg) {
            try {
                let oldState = state
                let [newState, ...cmds] = update(msg, state)
                if (!cmds)
                    cmds = []

                if (keepHistory != 0)
                    history.push([oldState, msg, newState, ...cmds])

                if ((keepHistory > 0) && (keepHistory < history.length))
                    history.shift()

                state = newState
                return cmds
            }
            catch (e) {
                throw e
            }

        }
        return {
            getState: () => state,
            getHistory: () => history,
            send: sendMsg,
        }
    }

export const createHook = <
    Model extends { state: string },
    Msg extends { type: string },
    Cmd extends { type: string }
>(
    update: (msg: Msg, model: Model) => readonly [Model, ...Cmd[]]
) =>
    (initial: () => readonly [Model, ...Cmd[]]) => {
        const [initialState, ...initialCmds] = initial()

        let hook = createHookRaw(update)(initialState)

        let initialCommandsProcessed = false


        let listeners = new Set<() => void>()

        type EffectHandler = (cmd: Cmd) => void
        let handlers = new Set<EffectHandler>()

        const runInitialEffects = () => {
            if (initialCommandsProcessed) return

            initialCmds.forEach(cmd => handlers.forEach(h => h(cmd)))
            initialCommandsProcessed = true
        }

        return {
            addHandler: (handler: EffectHandler) => {
                handlers.add(handler)
                runInitialEffects()
                return () => {
                    handlers.delete(handler)
                }
            },
            getState: () => hook.getState(),
            subscribe: (listener: () => void) => {
                listeners.add(listener)
                return () => {
                    listeners.delete(listener)
                }
            },
            send: (msg: Msg) => {
                let cmds = hook.send(msg)

                listeners.forEach(x => x())

                cmds.forEach(cmd => handlers.forEach(h => h(cmd)))
            }
        }
    }
