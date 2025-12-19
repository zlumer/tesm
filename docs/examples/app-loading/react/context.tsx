// #region example
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

// #endregion example

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

