import { describe, it, expect } from 'vitest'
import { machine, XMsg, XCmd, XModel, enhance } from '../utils/machine'
import { st } from '../utils/misc'


type InitialContext = {}

type LoadingContext = {
    loadingStarted: number
}
type LoadedContext = LoadingContext & {
    loadingFinished: number
}

const m = machine(
    {
        initial: st<InitialContext>(),
        loading: st<LoadingContext>(),
        loaded: st<LoadedContext>(),
    },
    {
        started_loading: (now: number) => ({ now }),
        finished_loading: (now: number) => ({ now }),
    },
    {
        startLoadingAnimation: () => ({}),
        displayPopup: (text: string) => ({ text }),
    }
)

export type Msg = XMsg<typeof m>
export type Cmd = XCmd<typeof m>
export type Model = XModel<typeof m>

export const LoadingState = enhance(
    m,
    "LoadingState",
    () => [m.states.initial({})],
    {
        initial: {
            started_loading: (msg, model) => [
                m.states.loading({ loadingStarted: msg.now }),
                m.cmds.startLoadingAnimation(),
            ],
        },
        loading: {
            finished_loading: (msg, model) => [
                m.states.loaded({
                    loadingStarted: model.loadingStarted,
                    loadingFinished: msg.now,
                }),
                m.cmds.displayPopup(
                    `Loading finished in ${msg.now - model.loadingStarted} milliseconds!`
                ),
            ],
        },
        loaded: {}
    })

describe('LoadingState', () => {
    it('should transition from initial to loading state', () => {
        let [state, ...cmds] = LoadingState.initial()

        expect(state).toEqual({ state: 'initial' })
        expect(cmds).toEqual([])

        const now = Date.now()

            ;[state, ...cmds] = LoadingState.update(
                { type: 'started_loading', now },
                state
            )

        expect(state).toEqual({
            state: 'loading',
            loadingStarted: now
        })
        expect(cmds).toEqual([{ type: 'startLoadingAnimation' }])
    })

    it('should transition from loading to loaded state', () => {
        let [state, ...cmds] = LoadingState.initial()

        expect(state).toEqual({ state: 'initial' })
        expect(cmds).toEqual([])

        const startTime = Date.now()
            ;[state] = LoadingState.update(
                { type: 'started_loading', now: startTime },
                state
            )

        const endTime = startTime + 1000

            ;[state, ...cmds] = LoadingState.update(
                { type: 'finished_loading', now: endTime },
                state
            )

        expect(state).toEqual({
            state: 'loaded',
            loadingStarted: startTime,
            loadingFinished: endTime
        })

        expect(cmds).toEqual([{
            type: 'displayPopup',
            text: `Loading finished in ${endTime - startTime} milliseconds!`
        }])
    })

    it('should throw irrelevant messages', () => {
        const [state] = LoadingState.initial()

        expect(() => LoadingState.update(
            { type: 'finished_loading', now: Date.now() },
            state
        )).toThrow()
    })
})
