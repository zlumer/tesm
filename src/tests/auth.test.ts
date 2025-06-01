import { describe, it, expect } from 'vitest'
import { Auth } from './machines/auth'

const { init, update } = Auth


describe('auth happy path', () => {
	it('should request OTP without existing refresh token', () => {
		let [state, ...cmds] = init()
		expect(state).toEqual({ state: "initial" })
		expect(cmds).toEqual([])
			;[state, ...cmds] = update(state, { type: "ui.auth_requested", tgid: 123, did: "abc" })
		expect(state).toEqual({ state: "checking_for_existing_refresh_token", tgid: 123, did: "abc" })
		expect(cmds).toEqual([{ type: "requestJwt", tgid: 123 }])

			;[state, ...cmds] = update(state, { type: "refresh_token_expired" })
		expect(state).toEqual({ state: "waiting_for_otp", tgid: 123, did: "abc" })
		expect(cmds).toEqual([{ type: "requestOtp", tgid: 123 }])
	})
	it('should request OTP without existing refresh token if jwt request fails', () => {
		let [state, ...cmds] = init()
		expect(state).toEqual({ state: "initial" })
		expect(cmds).toEqual([])
			;[state, ...cmds] = update(state, { type: "ui.auth_requested", tgid: 123, did: "abc" })
		expect(state).toEqual({ state: "checking_for_existing_refresh_token", tgid: 123, did: "abc" })
		expect(cmds).toEqual([{ type: "requestJwt", tgid: 123 }])

			;[state, ...cmds] = update(state, { type: "jwt_request_failed", error: "error", now: 1_000_000 })
		expect(state).toEqual({ state: "waiting_for_otp", tgid: 123, did: "abc" })
		expect(cmds).toEqual([{ type: "requestOtp", tgid: 123 }])
	})
	it('should login with existing refresh token', () => {
		let [state, ...cmds] = init()
		expect(state).toEqual({ state: "initial" })
		expect(cmds).toEqual([])
			;[state, ...cmds] = update(state, { type: "ui.auth_requested", tgid: 123, did: "abc" })
		expect(state).toEqual({ state: "checking_for_existing_refresh_token", tgid: 123, did: "abc" })
		expect(cmds).toEqual([{ type: "requestJwt", tgid: 123 }])

			;[state, ...cmds] = update(state, { type: "jwt_arrived", jwt: "jwt", expiry: 1_000_000 })
		expect(state).toEqual({ state: "authed", tgid: 123, did: "abc", jwt: "jwt", jwtExpiry: 1_000_000 * 1000, jwtRetriesLeft: 5 })
		expect(cmds).toEqual([{ type: "refreshJwt", tgid: 123, at: 1_000_000 * 1000 - 30_000 }])
	})
	it('should complete auth flow with expired refresh token', () => {
		let [state, ...cmds] = init()
		expect(state).toEqual({ state: "initial" })
		expect(cmds).toEqual([])
			;[state, ...cmds] = update(state, { type: "ui.auth_requested", tgid: 123, did: "abc" })
		expect(state).toEqual({ state: "checking_for_existing_refresh_token", tgid: 123, did: "abc" })
		expect(cmds).toEqual([{ type: "requestJwt", tgid: 123 }])

			;[state, ...cmds] = update(state, { type: "refresh_token_expired" })
		expect(state).toEqual({ state: "waiting_for_otp", tgid: 123, did: "abc" })
		expect(cmds).toEqual([{ type: "requestOtp", tgid: 123 }])

			;[state, ...cmds] = update(state, { type: "otp_arrived", otp: "otp" })
		expect(state).toEqual({ state: "polling_refresh", tgid: 123, did: "abc", otp: "otp" })
		expect(cmds).toEqual([{ type: "sendOtp", tgid: 123, otp: "otp", did: "abc" }])

			;[state, ...cmds] = update(state, { type: "refresh_token_arrived", token: "refresh123" })
		expect(state).toEqual({ state: "waiting_for_jwt", tgid: 123, did: "abc" })
		expect(cmds).toEqual([{ type: "requestJwt", tgid: 123 }])

			;[state, ...cmds] = update(state, { type: "jwt_arrived", jwt: "jwt", expiry: 1_000_000 })
		expect(state).toEqual({ state: "authed", tgid: 123, did: "abc", jwt: "jwt", jwtExpiry: 1_000_000 * 1000, jwtRetriesLeft: 5 })
		expect(cmds).toEqual([{ type: "refreshJwt", tgid: 123, at: 1_000_000 * 1000 - 30_000 }])
	})
	it('should complete auth flow without existing refresh token', () => {
		let [state, ...cmds] = init()
		expect(state).toEqual({ state: "initial" })
		expect(cmds).toEqual([])
			;[state, ...cmds] = update(state, { type: "ui.auth_requested", tgid: 123, did: "abc" })
		expect(state).toEqual({ state: "checking_for_existing_refresh_token", tgid: 123, did: "abc" })
		expect(cmds).toEqual([{ type: "requestJwt", tgid: 123 }])

			;[state, ...cmds] = update(state, { type: "jwt_request_failed", error: "error", now: 1_000_000 })
		expect(state).toEqual({ state: "waiting_for_otp", tgid: 123, did: "abc" })
		expect(cmds).toEqual([{ type: "requestOtp", tgid: 123 }])

			;[state, ...cmds] = update(state, { type: "otp_arrived", otp: "otp" })
		expect(state).toEqual({ state: "polling_refresh", tgid: 123, did: "abc", otp: "otp" })
		expect(cmds).toEqual([{ type: "sendOtp", tgid: 123, otp: "otp", did: "abc" }])

			;[state, ...cmds] = update(state, { type: "refresh_token_arrived", token: "refresh123" })
		expect(state).toEqual({ state: "waiting_for_jwt", tgid: 123, did: "abc" })
		expect(cmds).toEqual([{ type: "requestJwt", tgid: 123 }])

			;[state, ...cmds] = update(state, { type: "jwt_arrived", jwt: "jwt", expiry: 1_000_000 })
		expect(state).toEqual({ state: "authed", tgid: 123, did: "abc", jwt: "jwt", jwtExpiry: 1_000_000 * 1000, jwtRetriesLeft: 5 })
		expect(cmds).toEqual([{ type: "refreshJwt", tgid: 123, at: 1_000_000 * 1000 - 30_000 }])
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
		expect(cmds).toEqual([{ type: "requestJwt", tgid: 123 }])

			;[state, ...cmds] = update(state, { type: "jwt_arrived", jwt: "jwt", expiry: 1_000_000 })
		expect(state).toEqual({ state: "authed", tgid: 123, did: "abc", jwt: "jwt", jwtExpiry: 1_000_000 * 1000, jwtRetriesLeft: 5 })
		expect(cmds).toEqual([{ type: "refreshJwt", tgid: 123, at: 1_000_000 * 1000 - 30_000 }])

			;[state, ...cmds] = update(state, { type: "jwt_request_failed", error: "error", now: 1_000_001 * 1000 })
		expect(state).toEqual({ state: "auth_expired_no_network", tgid: 123, did: "abc", exponentialRetries: 0 })
		expect(cmds).toEqual([{ type: "refreshJwt", tgid: 123, at: 1_000_001 * 1000 + 3_000 }])

			;[state, ...cmds] = update(state, { type: "jwt_request_failed", error: "error", now: 1_000_005 * 1000 })
		expect(state).toEqual({ state: "auth_expired_no_network", tgid: 123, did: "abc", exponentialRetries: 1 })
		expect(cmds).toEqual([{ type: "refreshJwt", tgid: 123, at: 1_000_008 * 1000 }])
			;[state, ...cmds] = update(state, { type: "jwt_request_failed", error: "error", now: 1_000_009 * 1000 })
		expect(state).toEqual({ state: "auth_expired_no_network", tgid: 123, did: "abc", exponentialRetries: 2 })
		expect(cmds).toEqual([{ type: "refreshJwt", tgid: 123, at: 1_000_015 * 1000 }])
	})
})
