// #region example
import { machine, st, XMsg, XModel, XCmd, enhance } from "tesm"

type BaseContext = {
    tgid: number;
    did: string;
}

type InitialContext = {}

type CheckingForExistingRefreshTokenContext = BaseContext

type WaitingForOtpContext = BaseContext

type PollingRefreshContext = BaseContext & {
    otp: string;
}

type WaitingForJwtContext = BaseContext

type AuthedContext = BaseContext & {
    jwt: string;
    jwtExpiry: number;
    jwtRetriesLeft: number;
}

type OtpRequestFailedContext = BaseContext & {
    error: unknown;
}

type RefreshTokenRequestFailedContext = BaseContext & {
    otp: string;
    error: unknown;
}

type JwtRequestFailedContext = BaseContext & {
    error: unknown;
}

type AuthExpiredNoNetworkContext = BaseContext & {
    exponentialRetries: number;
}

const m = machine(
    {
        initial: st<InitialContext>(),
        checking_for_existing_refresh_token: st<CheckingForExistingRefreshTokenContext>(),
        waiting_for_otp: st<WaitingForOtpContext>(),
        polling_refresh: st<PollingRefreshContext>(),
        waiting_for_jwt: st<WaitingForJwtContext>(),
        authed: st<AuthedContext>(),
        otp_request_failed: st<OtpRequestFailedContext>(),
        refresh_token_request_failed: st<RefreshTokenRequestFailedContext>(),
        jwt_request_failed: st<JwtRequestFailedContext>(),
        auth_expired_no_network: st<AuthExpiredNoNetworkContext>()
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
        requestOtp: (tgid: number) => ({ tgid }),
        sendOtp: (tgid: number, otp: string, did: string) => ({ tgid, otp, did }),
        requestJwt: (tgid: number) => ({ tgid }),
        refreshJwt: (tgid: number, at: number) => ({ tgid, at }),
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
            m.cmds.requestJwt(msg.tgid),
            m.cmds.setExchangingCodeLoading(true),
        ],
    },
    checking_for_existing_refresh_token: {
        "jwt_request_failed": (msg, state) => [
            m.states.waiting_for_otp({ did: state.did, tgid: state.tgid }),
            m.cmds.requestOtp(state.tgid),
        ],
        "refresh_token_expired": (msg, state) => [
            m.states.waiting_for_otp({ did: state.did, tgid: state.tgid }),
            m.cmds.requestOtp(state.tgid),
        ],
        "jwt_arrived": ({ jwt, expiry }, state) => [
            m.states.authed({
                jwt,
                tgid: state.tgid, did: state.did,
                jwtExpiry: expiry * 1000,
                jwtRetriesLeft: JWT_RETRIES
            }),
            m.cmds.setExchangingCodeLoading(false),
            m.cmds.refreshJwt(state.tgid, (expiry * 1000) - JWT_REFRESH_BEFORE_EXPIRY),
        ],
    },
    waiting_for_otp: {
        "otp_arrived": (msg, state) => [
            m.states.polling_refresh({ tgid: state.tgid, did: state.did, otp: msg.otp }),
            m.cmds.sendOtp(state.tgid, msg.otp, state.did),
        ],
        "otp_request_failed": (msg, state) => [
            m.states.otp_request_failed({ tgid: state.tgid, did: state.did, error: msg.error }),
            m.cmds.setExchangingCodeLoading(false),
        ],
    },
    otp_request_failed: {
        "ui.auth_requested": (msg, state) => [
            m.states.waiting_for_otp({ tgid: msg.tgid, did: state.did }),
            m.cmds.requestOtp(msg.tgid),
            m.cmds.setExchangingCodeLoading(true),
        ],
    },
    polling_refresh: {
        "refresh_token_arrived": (msg, state) => [
            m.states.waiting_for_jwt({ tgid: state.tgid, did: state.did }),
            m.cmds.requestJwt(state.tgid),
        ],
        "refresh_token_request_failed": (msg, state) => [
            m.states.refresh_token_request_failed({ tgid: state.tgid, did: state.did, otp: state.otp, error: msg.error }),
            m.cmds.setExchangingCodeLoading(false),
        ],
    },
    refresh_token_request_failed: {
        "ui.auth_requested": (msg, state) => [
            m.states.polling_refresh({ tgid: state.tgid, did: state.did, otp: state.otp }),
            m.cmds.sendOtp(state.tgid, state.otp, state.did),
            m.cmds.setExchangingCodeLoading(true),
        ],
    },
    waiting_for_jwt: {
        "jwt_arrived": (msg, state) => [
            m.states.authed({
                tgid: state.tgid, did: state.did, jwt: msg.jwt, jwtExpiry: (msg.expiry * 1000), jwtRetriesLeft: JWT_RETRIES
            }),
            m.cmds.setExchangingCodeLoading(false),
            m.cmds.refreshJwt(state.tgid, (msg.expiry * 1000) - JWT_REFRESH_BEFORE_EXPIRY),
        ],
        "jwt_request_failed": (msg, state) => [
            m.states.jwt_request_failed({ tgid: state.tgid, did: state.did, error: msg.error }),
            m.cmds.setExchangingCodeLoading(false),
        ],
        "refresh_token_expired": (msg, state) => [
            m.states.waiting_for_otp({ tgid: state.tgid, did: state.did }),
            m.cmds.requestOtp(state.tgid),
            m.cmds.setExchangingCodeLoading(true),
        ],
    },
    jwt_request_failed: {
        "ui.auth_requested": (msg, state) => [
            m.states.waiting_for_jwt({ tgid: state.tgid, did: state.did }),
            m.cmds.requestJwt(state.tgid),
            m.cmds.setExchangingCodeLoading(true),
        ],
    },
    authed: {
        "jwt_arrived": (msg, state) => [
            m.states.authed({
                ...state, jwt: msg.jwt, jwtExpiry: (msg.expiry * 1000)
            }),
            m.cmds.refreshJwt(state.tgid, msg.expiry * 1000 - JWT_REFRESH_BEFORE_EXPIRY),
            m.cmds.setExchangingCodeLoading(false),
        ],
        "jwt_request_failed": (msg, state) => {
            let isExpired = msg.now >= state.jwtExpiry

            if (!isExpired) return [
                m.states.authed({ ...state, jwtRetriesLeft: state.jwtRetriesLeft - 1 }),
                m.cmds.refreshJwt(state.tgid, msg.now + JWT_RETRY_DELAY),
            ];

            if (state.jwtRetriesLeft <= 0) {
                let exponentialBackoff = Math.pow(2, -state.jwtRetriesLeft) * JWT_RETRY_DELAY
                return [
                    m.states.auth_expired_no_network({ tgid: state.tgid, did: state.did, exponentialRetries: 0 }),
                    m.cmds.refreshJwt(state.tgid, msg.now + exponentialBackoff),
                ];
            }
            return [
                m.states.auth_expired_no_network({ tgid: state.tgid, did: state.did, exponentialRetries: 0 }),
                m.cmds.refreshJwt(state.tgid, msg.now + JWT_RETRY_DELAY),
            ];

        },
        "refresh_token_expired": (msg, state) => [
            m.states.waiting_for_otp({ tgid: state.tgid, did: state.did }),
            m.cmds.requestOtp(state.tgid),
            m.cmds.setExchangingCodeLoading(true),
        ],
    },
    auth_expired_no_network: {
        "jwt_arrived": (msg, state) => [
            m.states.authed({
                tgid: state.tgid, did: state.did, jwt: msg.jwt, jwtExpiry: (msg.expiry * 1000), jwtRetriesLeft: JWT_RETRIES
            }),
            m.cmds.refreshJwt(state.tgid, (msg.expiry * 1000) - JWT_REFRESH_BEFORE_EXPIRY),
        ],
        "jwt_request_failed": (msg, state) => {
            let exponentialBackoff = Math.pow(2, state.exponentialRetries) * JWT_RETRY_DELAY
            return [
                m.states.auth_expired_no_network({
                    tgid: state.tgid, did: state.did, exponentialRetries: state.exponentialRetries + 1
                }),
                m.cmds.refreshJwt(state.tgid, msg.now + exponentialBackoff),
            ];
        },
    },
})
// #endregion example


export namespace Auth {
    export type State = XModel<typeof m>
    export type Msg = XMsg<typeof m>
    export type Cmd = XCmd<typeof m>

    export function init(): [State, ...Cmd[]] {
        return [m.states.initial({})]
    }


    function filterLegacyCmds(cmds: Cmd[]): Cmd[] {
        return cmds.filter(cmd => cmd.type !== "setExchangingCodeLoading")
    }
    function cleanupLegacy(res: readonly [State, ...Cmd[]]): [State, ...Cmd[]] {
        let [state, ...cmds] = res
        return [state, ...filterLegacyCmds(cmds)]
    }
    export function update(state: State, msg: Msg): [State, ...Cmd[]] {
        return cleanupLegacy(enhanced.update(msg, state))
    }

    export const machine = enhanced
}