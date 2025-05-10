import { describe, it, expect } from 'vitest'
import { LoadingState, } from '../examples/loading'

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
