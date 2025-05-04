import { enhance, machine, XCmd, XModel, XMsg } from "../utils/machine"
import { describe, it, expect } from 'vitest'

type InitialContext = {}
type CheckingForExistingRefreshTokenContext = { tgid: number; did: string }
type WaitingForOtpContext = CheckingForExistingRefreshTokenContext & {}
type PollingRefreshContext = WaitingForOtpContext & {
	otp: string
}
type WaitingForJWTContext = CheckingForExistingRefreshTokenContext & {}
type AuthedContext = CheckingForExistingRefreshTokenContext & {
	jwtExpiry: number
	jwtRetriesLeft: number,
	jwt: string
}
type OtpRequestFailedContext = CheckingForExistingRefreshTokenContext & {
	error: unknown
}
type RefreshTokenRequrestFailedContext = CheckingForExistingRefreshTokenContext & {
	error: unknown,
	otp: string
}
type JwtRequesFailedContext = CheckingForExistingRefreshTokenContext & {
	error: unknown
}
type AuthExpiredNoNetworkContext = CheckingForExistingRefreshTokenContext & {
	exponentialRetries: number
}

export const id =
	<T extends {}>() =>
		(m: T) =>
			m

const m = machine(
	{
		initial: id<InitialContext>(),
		checking_for_existing_refresh_token: id<CheckingForExistingRefreshTokenContext>(),
		waiting_for_otp: id<WaitingForOtpContext>(),
		polling_refresh: id<PollingRefreshContext>(),
		waiting_for_jwt: id<WaitingForJWTContext>(),
		authed: id<AuthedContext>(),
		otp_request_failed: id<OtpRequestFailedContext>(),
		refresh_token_request_failed: id<RefreshTokenRequrestFailedContext>(),
		jwt_request_failed: id<JwtRequesFailedContext>(),
		auth_expired_no_network: id<AuthExpiredNoNetworkContext>(),
	},
	{
		"ui.auth_requested": (tgid: number, did: string) => ({ tgid, did }),
		otp_arrived: (otp: string) => ({ otp }),
		refresh_token_arrived: (token: string) => ({ token }),
		jwt_arrived: (jwt: string, expiry: number) => ({ jwt, expiry }),
		refresh_token_expired: () => ({}),
		otp_request_failed: (error: unknown) => ({ error }),
		refresh_token_request_failed: (error: unknown) => ({ error }),
		jwt_request_failed: (now: number, error: unknown) => ({ now, error }),
	},
	{
		request_otp: (tgid: number) => ({ tgid }),
		send_otp: (tgid: number, otp: string, did: string) => ({ tgid, otp, did }),
		request_jwt: (tgid: number) => ({ tgid }),
		refresh_jwt: (tgid: number, at: number) => ({ tgid, at }),
		setExchangingCodeLoading: (value: boolean) => ({ value }),
	}
)

const JWT_RETRIES = 5
const JWT_REFRESH_BEFORE_EXPIRY = 30_000
const JWT_RETRY_DELAY = 3_000

const enhanced = enhance(m, "auth", () => [m.states.initial({})], {
	initial: {
		"ui.auth_requested": (msg, state) => [
			m.states.checking_for_existing_refresh_token({ tgid: msg.tgid, did: msg.did }),
			m.cmds.request_jwt(msg.tgid),
			m.cmds.setExchangingCodeLoading(true),
		],
	},
	checking_for_existing_refresh_token: {
		"jwt_request_failed": (msg, state) => [
			m.states.waiting_for_otp({ did: state.did, tgid: state.tgid }),
			m.cmds.request_otp(state.tgid),
		],
		"refresh_token_expired": (msg, state) => [
			m.states.waiting_for_otp({ did: state.did, tgid: state.tgid }),
			m.cmds.request_otp(state.tgid),
		],
		"jwt_arrived": ({ jwt, expiry }, state) => [
			m.states.authed({
				jwt,
				tgid: state.tgid, did: state.did,
				jwtExpiry: expiry * 1000,
				jwtRetriesLeft: JWT_RETRIES
			}),
			m.cmds.setExchangingCodeLoading(false),
			m.cmds.refresh_jwt(state.tgid, (expiry * 1000) - JWT_REFRESH_BEFORE_EXPIRY),
		],
	},
	waiting_for_otp: {
		"otp_arrived": (msg, state) => [
			m.states.polling_refresh({ tgid: state.tgid, did: state.did, otp: msg.otp }),
			m.cmds.send_otp(state.tgid, msg.otp, state.did),
		],
		"otp_request_failed": (msg, state) => [
			m.states.otp_request_failed({ tgid: state.tgid, did: state.did, error: msg.error }),
			m.cmds.setExchangingCodeLoading(false),
		],
	},
	otp_request_failed: {
		"ui.auth_requested": (msg, state) => [
			m.states.waiting_for_otp({ tgid: msg.tgid, did: state.did }),
			m.cmds.request_otp(msg.tgid),
			m.cmds.setExchangingCodeLoading(true),
		],
	},
	polling_refresh: {
		"refresh_token_arrived": (msg, state) => [
			m.states.waiting_for_jwt({ tgid: state.tgid, did: state.did }),
			m.cmds.request_jwt(state.tgid),
		],
		"refresh_token_request_failed": (msg, state) => [
			m.states.refresh_token_request_failed({ tgid: state.tgid, did: state.did, otp: state.otp, error: msg.error }),
			m.cmds.setExchangingCodeLoading(false),
		],
	},
	refresh_token_request_failed: {
		"ui.auth_requested": (msg, state) => [
			m.states.polling_refresh({ tgid: state.tgid, did: state.did, otp: state.otp }),
			m.cmds.send_otp(state.tgid, state.otp, state.did),
			m.cmds.setExchangingCodeLoading(true),
		],
	},
	waiting_for_jwt: {
		"jwt_arrived": (msg, state) => [
			m.states.authed({
				tgid: state.tgid, did: state.did, jwt: msg.jwt, jwtExpiry: (msg.expiry * 1000), jwtRetriesLeft: JWT_RETRIES
			}),
			m.cmds.setExchangingCodeLoading(false),
			m.cmds.refresh_jwt(state.tgid, (msg.expiry * 1000) - JWT_REFRESH_BEFORE_EXPIRY),
		],
		"jwt_request_failed": (msg, state) => [
			m.states.jwt_request_failed({ tgid: state.tgid, did: state.did, error: msg.error }),
			m.cmds.setExchangingCodeLoading(false),
		],
		"refresh_token_expired": (msg, state) => [
			m.states.waiting_for_otp({ tgid: state.tgid, did: state.did }),
			m.cmds.request_otp(state.tgid),
			m.cmds.setExchangingCodeLoading(true),
		],
	},
	jwt_request_failed: {
		"ui.auth_requested": (msg, state) => [
			m.states.waiting_for_jwt({ tgid: state.tgid, did: state.did }),
			m.cmds.request_jwt(state.tgid),
			m.cmds.setExchangingCodeLoading(true),
		],
	},
	authed: {
		"jwt_arrived": (msg, state) => [
			m.states.authed({
				...state, jwt: msg.jwt, jwtExpiry: (msg.expiry * 1000)
			}),
			m.cmds.refresh_jwt(state.tgid, msg.expiry * 1000 - JWT_REFRESH_BEFORE_EXPIRY),
			m.cmds.setExchangingCodeLoading(false),
		],
		"jwt_request_failed": (msg, state) => {
			let isExpired = msg.now >= state.jwtExpiry
			if (isExpired) {
				if (state.jwtRetriesLeft <= 0) {
					let exponentialBackoff = Math.pow(2, -state.jwtRetriesLeft) * JWT_RETRY_DELAY
					return [
						m.states.auth_expired_no_network({ tgid: state.tgid, did: state.did, exponentialRetries: 0 }),
						m.cmds.refresh_jwt(state.tgid, msg.now + exponentialBackoff),
					];
				}
				return [
					m.states.auth_expired_no_network({ tgid: state.tgid, did: state.did, exponentialRetries: 0 }),
					m.cmds.refresh_jwt(state.tgid, msg.now + JWT_RETRY_DELAY),
				];
			}
			return [
				m.states.authed({ ...state, jwtRetriesLeft: state.jwtRetriesLeft - 1 }),
				m.cmds.refresh_jwt(state.tgid, msg.now + JWT_RETRY_DELAY),
			];
		},
		"refresh_token_expired": (msg, state) => [
			m.states.waiting_for_otp({ tgid: state.tgid, did: state.did }),
			m.cmds.request_otp(state.tgid),
			m.cmds.setExchangingCodeLoading(true),
		],
	},
	auth_expired_no_network: {
		"jwt_arrived": (msg, state) => [
			m.states.authed({
				tgid: state.tgid, did: state.did, jwt: msg.jwt, jwtExpiry: (msg.expiry * 1000), jwtRetriesLeft: JWT_RETRIES
			}),
			m.cmds.refresh_jwt(state.tgid, (msg.expiry * 1000) - JWT_REFRESH_BEFORE_EXPIRY),
		],
		"jwt_request_failed": (msg, state) => {
			let exponentialBackoff = Math.pow(2, state.exponentialRetries) * JWT_RETRY_DELAY
			return [
				m.states.auth_expired_no_network({
					tgid: state.tgid, did: state.did, exponentialRetries: state.exponentialRetries + 1
				}),
				m.cmds.refresh_jwt(state.tgid, msg.now + exponentialBackoff),
			];
		},
	},
})

type State = XModel<typeof m>
type Msg = XMsg<typeof m>
type Cmd = XCmd<typeof m>

export function init(): [State, ...Cmd[]] {
	return [{ state: "initial" }]
}
function filterLegacyCmds(cmds: Cmd[]): Cmd[] {
	return cmds.filter(cmd => cmd.type !== "setExchangingCodeLoading")
}
function cleanupLegacy(res: readonly [State, ...Cmd[]]): [State, ...Cmd[]] {
	let [state, ...cmds] = res
	return [state, ...filterLegacyCmds(cmds)]
}
function update(state: State, msg: Msg): [State, ...Cmd[]] {
	return cleanupLegacy(enhanced.update(msg, state))
}


describe('auth happy path', () => {
	it('should request OTP without existing refresh token', () => {
		let [state, ...cmds] = init()
		expect(state).toEqual({ state: "initial" })
		expect(cmds).toEqual([])
			;[state, ...cmds] = update(state, { type: "ui.auth_requested", tgid: 123, did: "abc" })
		expect(state).toEqual({ state: "checking_for_existing_refresh_token", tgid: 123, did: "abc" })
		expect(cmds).toEqual([{ type: "request_jwt", tgid: 123 }])

			;[state, ...cmds] = update(state, { type: "refresh_token_expired" })
		expect(state).toEqual({ state: "waiting_for_otp", tgid: 123, did: "abc" })
		expect(cmds).toEqual([{ type: "request_otp", tgid: 123 }])
	})
	it('should request OTP without existing refresh token if jwt request fails', () => {
		let [state, ...cmds] = init()
		expect(state).toEqual({ state: "initial" })
		expect(cmds).toEqual([])
			;[state, ...cmds] = update(state, { type: "ui.auth_requested", tgid: 123, did: "abc" })
		expect(state).toEqual({ state: "checking_for_existing_refresh_token", tgid: 123, did: "abc" })
		expect(cmds).toEqual([{ type: "request_jwt", tgid: 123 }])

			;[state, ...cmds] = update(state, { type: "jwt_request_failed", error: "error", now: 1_000_000 })
		expect(state).toEqual({ state: "waiting_for_otp", tgid: 123, did: "abc" })
		expect(cmds).toEqual([{ type: "request_otp", tgid: 123 }])
	})
	it('should login with existing refresh token', () => {
		let [state, ...cmds] = init()
		expect(state).toEqual({ state: "initial" })
		expect(cmds).toEqual([])
			;[state, ...cmds] = update(state, { type: "ui.auth_requested", tgid: 123, did: "abc" })
		expect(state).toEqual({ state: "checking_for_existing_refresh_token", tgid: 123, did: "abc" })
		expect(cmds).toEqual([{ type: "request_jwt", tgid: 123 }])

			;[state, ...cmds] = update(state, { type: "jwt_arrived", jwt: "jwt", expiry: 1_000_000 })
		expect(state).toEqual({ state: "authed", tgid: 123, did: "abc", jwt: "jwt", jwtExpiry: 1_000_000 * 1000, jwtRetriesLeft: 5 })
		expect(cmds).toEqual([{ type: "refresh_jwt", tgid: 123, at: 1_000_000 * 1000 - 30_000 }])
	})
	it('should complete auth flow with expired refresh token', () => {
		let [state, ...cmds] = init()
		expect(state).toEqual({ state: "initial" })
		expect(cmds).toEqual([])
			;[state, ...cmds] = update(state, { type: "ui.auth_requested", tgid: 123, did: "abc" })
		expect(state).toEqual({ state: "checking_for_existing_refresh_token", tgid: 123, did: "abc" })
		expect(cmds).toEqual([{ type: "request_jwt", tgid: 123 }])

			;[state, ...cmds] = update(state, { type: "refresh_token_expired" })
		expect(state).toEqual({ state: "waiting_for_otp", tgid: 123, did: "abc" })
		expect(cmds).toEqual([{ type: "request_otp", tgid: 123 }])

			;[state, ...cmds] = update(state, { type: "otp_arrived", otp: "otp" })
		expect(state).toEqual({ state: "polling_refresh", tgid: 123, did: "abc", otp: "otp" })
		expect(cmds).toEqual([{ type: "send_otp", tgid: 123, otp: "otp", did: "abc" }])

			;[state, ...cmds] = update(state, { type: "refresh_token_arrived", token: "refresh123" })
		expect(state).toEqual({ state: "waiting_for_jwt", tgid: 123, did: "abc" })
		expect(cmds).toEqual([{ type: "request_jwt", tgid: 123 }])

			;[state, ...cmds] = update(state, { type: "jwt_arrived", jwt: "jwt", expiry: 1_000_000 })
		expect(state).toEqual({ state: "authed", tgid: 123, did: "abc", jwt: "jwt", jwtExpiry: 1_000_000 * 1000, jwtRetriesLeft: 5 })
		expect(cmds).toEqual([{ type: "refresh_jwt", tgid: 123, at: 1_000_000 * 1000 - 30_000 }])
	})
	it('should complete auth flow without existing refresh token', () => {
		let [state, ...cmds] = init()
		expect(state).toEqual({ state: "initial" })
		expect(cmds).toEqual([])
			;[state, ...cmds] = update(state, { type: "ui.auth_requested", tgid: 123, did: "abc" })
		expect(state).toEqual({ state: "checking_for_existing_refresh_token", tgid: 123, did: "abc" })
		expect(cmds).toEqual([{ type: "request_jwt", tgid: 123 }])

			;[state, ...cmds] = update(state, { type: "jwt_request_failed", error: "error", now: 1_000_000 })
		expect(state).toEqual({ state: "waiting_for_otp", tgid: 123, did: "abc" })
		expect(cmds).toEqual([{ type: "request_otp", tgid: 123 }])

			;[state, ...cmds] = update(state, { type: "otp_arrived", otp: "otp" })
		expect(state).toEqual({ state: "polling_refresh", tgid: 123, did: "abc", otp: "otp" })
		expect(cmds).toEqual([{ type: "send_otp", tgid: 123, otp: "otp", did: "abc" }])

			;[state, ...cmds] = update(state, { type: "refresh_token_arrived", token: "refresh123" })
		expect(state).toEqual({ state: "waiting_for_jwt", tgid: 123, did: "abc" })
		expect(cmds).toEqual([{ type: "request_jwt", tgid: 123 }])

			;[state, ...cmds] = update(state, { type: "jwt_arrived", jwt: "jwt", expiry: 1_000_000 })
		expect(state).toEqual({ state: "authed", tgid: 123, did: "abc", jwt: "jwt", jwtExpiry: 1_000_000 * 1000, jwtRetriesLeft: 5 })
		expect(cmds).toEqual([{ type: "refresh_jwt", tgid: 123, at: 1_000_000 * 1000 - 30_000 }])
	})
})
describe("auth error handling", () => {
	it.todo("should retry to request OTP in case of network error")
	it.todo("should retry to request JWT in case of network error")
	it.todo("should timeout after sending message to bot")
	it.todo("should timeout after polling for refresh token")
	// all states should be recoverable from in the UI

	it("should go to expired state if jwt request fails after expiry", () => {
		let [state, ...cmds] = init()
		expect(state).toEqual({ state: "initial" })
		expect(cmds).toEqual([])
			;[state, ...cmds] = update(state, { type: "ui.auth_requested", tgid: 123, did: "abc" })
		expect(state).toEqual({ state: "checking_for_existing_refresh_token", tgid: 123, did: "abc" })
		expect(cmds).toEqual([{ type: "request_jwt", tgid: 123 }])

			;[state, ...cmds] = update(state, { type: "jwt_arrived", jwt: "jwt", expiry: 1_000_000 })
		expect(state).toEqual({ state: "authed", tgid: 123, did: "abc", jwt: "jwt", jwtExpiry: 1_000_000 * 1000, jwtRetriesLeft: 5 })
		expect(cmds).toEqual([{ type: "refresh_jwt", tgid: 123, at: 1_000_000 * 1000 - 30_000 }])

			;[state, ...cmds] = update(state, { type: "jwt_request_failed", error: "error", now: 1_000_001 * 1000 })
		expect(state).toEqual({ state: "auth_expired_no_network", tgid: 123, did: "abc", exponentialRetries: 0 })
		expect(cmds).toEqual([{ type: "refresh_jwt", tgid: 123, at: 1_000_001 * 1000 + 3_000 }])

			;[state, ...cmds] = update(state, { type: "jwt_request_failed", error: "error", now: 1_000_005 * 1000 })
		expect(state).toEqual({ state: "auth_expired_no_network", tgid: 123, did: "abc", exponentialRetries: 1 })
		expect(cmds).toEqual([{ type: "refresh_jwt", tgid: 123, at: 1_000_008 * 1000 }])
			;[state, ...cmds] = update(state, { type: "jwt_request_failed", error: "error", now: 1_000_009 * 1000 })
		expect(state).toEqual({ state: "auth_expired_no_network", tgid: 123, did: "abc", exponentialRetries: 2 })
		expect(cmds).toEqual([{ type: "refresh_jwt", tgid: 123, at: 1_000_015 * 1000 }])
	})
})
