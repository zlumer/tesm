import { describe, it, expect } from 'vitest'
import { machine, enhanceMachine } from '../utils/machine'
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

export const { update, initial } = enhanceMachine(
    m,
    "LoadingState",
    () => [m.states.initial({})],
    {
        initial: {
            // there is no `started_loading` msg handler in the main flow
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
    },
    // Messages from the extra flow will be used in all transitions where they are not explicitly handled in the main flow
    {
        started_loading: (msg, model) => [
            m.states.loading({ loadingStarted: msg.now }),
            m.cmds.startLoadingAnimation(),
        ],
        finished_loading: (msg, model) => [
            model,
        ],
    })


describe('extra flow msg', () => {
    it('should call msg `started_loading` from extra flow', () => {
        let [state, ...cmds] = initial()
        expect(state).toEqual({ state: "initial" })
        expect(cmds).toEqual([])

        const now = Date.now()
            ;[state, ...cmds] = update({ type: "started_loading", now: now }, state)
        expect(state).toEqual({ state: "loading", loadingStarted: now })
        expect(cmds).toEqual([{ type: "startLoadingAnimation" }])
    })

    it('should not call msg `finished_loading` from extra flow', () => {
        let [state, ...cmds] = initial()
        expect(state).toEqual({ state: "initial" })
        expect(cmds).toEqual([])

        const start = Date.now()
            ;[state, ...cmds] = update({ type: "started_loading", now: start }, state)

        const finish = Date.now()
            ;[state, ...cmds] = update({ type: "finished_loading", now: finish }, state)
        expect(state).toEqual({ state: "loaded", loadingStarted: start, loadingFinished: finish })
    })
})