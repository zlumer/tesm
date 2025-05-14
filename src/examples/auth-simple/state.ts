import { machine, st, XMsg, XModel, XCmd, enhance } from "tesm"

type NotAuthedContext = {}

type WaitingForJwtContext = {
    username: string;
    password: string;
}

type JwtRequestFailedContext = { error: unknown }

type AuthExpiredNoNetworkContext = {
    exponentialRetries: number;
    refreshToken: string;
}

type AuthedContext = {
    jwt: string;
    jwtExpiryMs: number;
    jwtRetriesLeft: number;
    refreshToken: string;
}

const m = machine(
    {
        not_authed: st<NotAuthedContext>(),
        waiting_for_jwt: st<WaitingForJwtContext>(),
        jwt_request_failed: st<JwtRequestFailedContext>(),
        authed: st<AuthedContext>(),
        auth_expired_no_network: st<AuthExpiredNoNetworkContext>(),
    },
    {
        auth_requested: (username: string, password: string) => ({ username, password }),
        jwt_arrived: (jwt: string, expiry: number, refreshToken: string) => ({ jwt, expiry, refreshToken }),
        jwt_request_failed: (error: unknown, now: number) => ({ error, now }),
        refresh_token_expired: () => ({}),
    },
    {
        requestJwt: (username: string, password: string) => ({ username, password }),
        refreshJwt: (refreshToken: string, at: number) => ({ refreshToken, at }),
    }
)

const JWT_RETRIES = 5
const JWT_RETRY_DELAY = 3_000

const AuthState = enhance(
    m,
    "AuthState",
    () => [m.states.not_authed({})],
    {
        not_authed: {
            auth_requested: (msg, model) => [
                m.states.waiting_for_jwt({ username: msg.username, password: msg.password }),
                m.cmds.requestJwt(msg.username, msg.password),
            ],
        },
        waiting_for_jwt: {
            jwt_arrived: (msg, model) => [
                m.states.authed({ jwt: msg.jwt, jwtExpiryMs: msg.expiry * 1000, refreshToken: msg.refreshToken, jwtRetriesLeft: JWT_RETRIES }),
            ],
            jwt_request_failed: (msg, model) => [
                m.states.jwt_request_failed({ error: msg.error }),
            ],
        },
        authed: {
            jwt_arrived: (msg, model) => [
                m.states.authed({ jwt: msg.jwt, jwtExpiryMs: msg.expiry * 1000, refreshToken: msg.refreshToken, jwtRetriesLeft: JWT_RETRIES }),
            ],
            jwt_request_failed: (msg, model) => {
                let isExpired = msg.now >= model.jwtExpiryMs

                if (!isExpired) return [
                    m.states.authed({ ...model, jwtRetriesLeft: model.jwtRetriesLeft - 1 }),
                    m.cmds.refreshJwt(model.refreshToken, msg.now + JWT_RETRY_DELAY),
                ];

                if (model.jwtRetriesLeft <= 0) // we probably don't have network right now, start exponential backoff
                {
                    let exponentialBackoff = Math.pow(2, -model.jwtRetriesLeft) * JWT_RETRY_DELAY
                    return [
                        m.states.auth_expired_no_network({ exponentialRetries: 0, refreshToken: model.refreshToken }),
                        m.cmds.refreshJwt(model.refreshToken, msg.now + exponentialBackoff)
                    ];
                }
                return [
                    m.states.authed({ ...model, jwtRetriesLeft: model.jwtRetriesLeft - 1 }),
                    m.cmds.refreshJwt(model.refreshToken, msg.now + JWT_RETRY_DELAY),
                ];
            },
            refresh_token_expired: (msg, model) => [
                m.states.not_authed({}),
            ],
        },
        auth_expired_no_network: {
            jwt_arrived: (msg, model) => [
                m.states.authed({ jwt: msg.jwt, jwtExpiryMs: msg.expiry * 1000, refreshToken: msg.refreshToken, jwtRetriesLeft: JWT_RETRIES }),
            ],
            jwt_request_failed: (msg, model) => {
                let exponentialBackoff = Math.pow(2, model.exponentialRetries) * JWT_RETRY_DELAY
                return [
                    m.states.auth_expired_no_network({ ...model, exponentialRetries: model.exponentialRetries + 1 }),
                    m.cmds.refreshJwt(model.refreshToken, msg.now + exponentialBackoff),
                ];
            }
        },
    })

export namespace AuthFlowSimple {
    export type Msg = XMsg<typeof AuthState>
    export type Cmd = XCmd<typeof AuthState>
    export type Model = XModel<typeof AuthState>

    export const machine = AuthState

}