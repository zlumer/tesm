// #region example
import { createContext, PropsWithChildren, useContext } from "react"
import { AppLoading } from "../state"
import { MsgsProxy, useTeaSimple } from "tesm/react"

const GlobalStateContext = createContext<
	{ model: AppLoading.Model; msgs: MsgsProxy<AppLoading.Msg> } | undefined
>(undefined)

export const GlobalStateProvider: React.FC<PropsWithChildren> = (props) => {
	const [state, msgs] = useTeaSimple(AppLoading.machine, {
		initialize: async () => {
			await sleep(1000)
			return msgs.initialized({
				data: {
					configUrl: "https://example.com/config.json",
					userId: "user123",
					username: "user",
				},
			})
		},
		loadConfig: async (configUrl) => {
			await sleep(1000)
			return msgs.config_loaded({
				config: {},
				now: Date.now(),
			})
		},
		loadLocalStorage: async () => {
			await sleep(1000)
			return msgs.local_storage_loaded({
				localSave: {},
			})
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

type RefreshJwtResponse =
	| {
			token: string
			refreshToken: string
			expiresAt: number
			expired: false
	  }
	| {
			expired: true
	  }
const Auth = {
	jwt: async (username: string, password: string) => {
		if (username === "user" && password === "password") {
			return {
				token: "some_token",
				refreshToken: "refresh-token-123",
				expiresAt: Date.now() + 3600000,
			}
		}

		throw new Error("Invalid credentials")
	},

	refreshJwt: async (refreshToken: string): Promise<RefreshJwtResponse> => {
		if (refreshToken === "refresh-token-123") {
			return {
				token: "some_token",
				refreshToken: "refresh-token-456",
				expiresAt: Date.now() + 3600000,
				expired: false,
			}
		}

		if (refreshToken === "refresh-token-expired") {
			return {
				expired: true,
			}
		}

		throw new Error("Invalid refresh token")
	},
}
