// #region example
import { createContext, useContext } from "react"
import { AuthFlowSimple } from "../state"
import { MsgsProxy, useTeaSimple } from "tesm/react"

const AuthContext = createContext<
	{ model: AuthFlowSimple.Model; msgs: MsgsProxy<AuthFlowSimple.Msg> } | undefined
>(undefined)

export const AuthProvider = () => {
	const [state, msgs] = useTeaSimple(AuthFlowSimple.machine, {
		requestJwt: async (props) => {
			try {
				const res = await Auth.jwt(props.username, props.password)
				return msgs.jwt_arrived({
					jwt: res.token,
					expiry: res.expiresAt,
					refreshToken: res.refreshToken,
				})
			} catch (error) {
				return msgs.jwt_request_failed({ error, now: Date.now() })
			}
		},
		refreshJwt: async ({ refreshToken, at }) => {
			await sleep(at - Date.now())
			try {
				const res = await Auth.refreshJwt(refreshToken)

				if (res.expired) {
					return msgs.refresh_token_expired({})
				}

				return msgs.jwt_arrived({
					jwt: res.token,
					expiry: res.expiresAt,
					refreshToken: res.refreshToken,
				})
			} catch (error) {
				return msgs.jwt_request_failed({ error, now: Date.now() })
			}
		},
	})
	return <AuthContext.Provider value={{ model: state, msgs }}> </AuthContext.Provider>
}

export function useAuthContext() {
	let ctx = useContext(AuthContext)
	if (!ctx) throw new Error("useAuthContext must be used within a AuthProvider")

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
