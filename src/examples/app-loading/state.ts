// #region example-full
// #region example
import { machine, st, XMsg, XModel, XCmd, enhance } from "tesm"

type InitialContext = {
    loadingStarted: number;
}
type WaitingInitialize = InitialContext & {
    localSave: LocalSave;
}
type LoadingConfigContext = WaitingInitialize & {
    initialize_data: Initialize
}

type LoadedContext = LoadingConfigContext & {
    config: Config;
    loadingFinished: number;
}

const m = machine(
    {
        initial: st<InitialContext>(),
        waiting_initialize: st<WaitingInitialize>(),
        waiting_config: st<LoadingConfigContext>(),
        loaded: st<LoadedContext>(),
    },
    {
        initialized: (data: Initialize) => ({ data }),
        config_loaded: (config: Config, now: number) => ({ config, now }),
        local_storage_loaded: (localSave: LocalSave) => ({ localSave }),
    },
    {
        loadLocalStorage: () => ({}),
        initialize: () => ({}),
        loadConfig: (configUrl: string) => ({ configUrl }),
    }
)

const AppLoadingState = enhance(
    m,
    "AppLoadingState",
    () => [m.states.initial({ loadingStarted: Date.now() }), m.cmds.loadLocalStorage()],
    {
        initial: {
            local_storage_loaded: (msg, model) => {
                return [
                    m.states.waiting_initialize({
                        ...model,
                        localSave: msg.localSave
                    }),
                    m.cmds.initialize()
                ];
            }
        },
        waiting_initialize: {
            initialized: (msg, model) => {
                return [
                    m.states.waiting_config({
                        ...model,
                        initialize_data: msg.data
                    }),
                    m.cmds.loadConfig(msg.data.configUrl)
                ];
            }
        },
        waiting_config: {
            config_loaded: (msg, model) => {
                return [
                    m.states.loaded({
                        ...model,
                        config: msg.config,
                        loadingFinished: msg.now
                    }),
                ];
            }
        }
    }
)

export namespace AppLoading {
    export type Msg = XMsg<typeof AppLoadingState>
    export type Cmd = XCmd<typeof AppLoadingState>
    export type Model = XModel<typeof AppLoadingState>

    export const machine = AppLoadingState
}

// #endregion example

type Initialize = {
    configUrl: string;
    username: string;
    userId: string;
    // ... other properties
}

type LocalSave = {
    // ... properties for local save
}

type Config = {
    // ... properties for config
}

// #endregion example-full