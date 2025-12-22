# The Elm State Machine

The Elm State Machine is a state management library based on [The Elm Architecture](https://guide.elm-lang.org/architecture/).

This library makes use of concepts familiar to Elm programmers (such as Model, Msg, Cmd) to manage application state in a totally **pure** way.

TESM is written in TypeScript. While vanilla JavaScript is supported, it is highly recommended to use TypeScript for the benefit of strict type checking.

# Documentation

You can find the full documentation [here](https://zlumer.github.io/tesm/).

- [llms.txt](https://zlumer.github.io/tesm/llms.txt)
- [llms-full.txt](https://zlumer.github.io/tesm/llms-full.txt)

# App loading flow example

## Machine
```typescript
import { machine, st, XMsg, XModel, XCmd, defineFlow } from "tesm"

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

const AppLoadingState = defineFlow(
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
        },
        loaded: {}
    }
)

export namespace AppLoading {
    export type Msgs = ReturnType<typeof AppLoadingState.msgCreator>;
    export type Cmd = XCmd<typeof AppLoadingState>
    export type Model = XModel<typeof AppLoadingState>

    export const machine = AppLoadingState
}



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
```

## React

`context.tsx`

```typescript
import { createContext, PropsWithChildren, useContext } from "react"
import { AppLoading } from "../state"
import { useTeaSimple } from "tesm/react"

const GlobalStateContext = createContext<
	{ model: AppLoading.Model; msgs: AppLoading.Msgs } | undefined
>(undefined)

export const GlobalStateProvider: React.FC<PropsWithChildren> = (props) => {
	const [state, msgs] = useTeaSimple(AppLoading.machine, {
		initialize: async (cmd, msgs) => {
			await sleep(1000)
			return msgs.initialized({
				configUrl: "https://example.com/config.json",
				userId: "user123",
				username: "user",
			})
		},
		loadConfig: async (cmd, msgs) => {
			await sleep(1000)
			return msgs.config_loaded({}, Date.now())
		},
		loadLocalStorage: async (cmd, msgs) => {
			await sleep(1000)
			return msgs.local_storage_loaded({})
		},
	})
	return (
		<GlobalStateContext.Provider value={{ model: state, msgs }}>
			{props.children}
		</GlobalStateContext.Provider>
	)
}

export function useGlobalState() {
	let ctx = useContext(GlobalStateContext)
	if (!ctx) throw new Error("useGlobalState must be used within a GlobalStateProvider")

	return ctx
}
```

`AppLoader.tsx`

```typescript
import { SpecificState } from "tesm"
import { AppLoading } from "../state"
import { useGlobalState } from "./context"

type LoadedModel = SpecificState<AppLoading.Model, "loaded">

const App = (props: LoadedModel) => {
	return (
		<div>
			<h1>Welcome {props.initialize_data.username}</h1>
		</div>
	)
}

const LoadingScreen = (props: { stage: AppLoading.Model["state"] }) => {
	return <div>loading stage: {props.stage}</div>
}

export const AppLoader = () => {
	const { model } = useGlobalState()

	switch (model.state) {
		case "initial":
		case "waiting_initialize":
		case "waiting_config":
			return <LoadingScreen stage={model.state} />
		case "loaded":
			return <App {...model} />
	}
}
```