import { it, expect, vi, describe } from 'vitest'
import { LoadingState } from '../machines/loading'
import { useTeaSimple } from '../../react'
import { renderHook, act } from '@testing-library/react'
import { StrictMode } from 'react'
import { CounterState } from '../machines/counter'

describe("StrictMode", () => {
    it("commands are not duplicated", () => {
        const mockHandlers = {
            startLoadingAnimation: vi.fn(),
            displayPopup: vi.fn()
        }

        const { result } = renderHook(() =>
            useTeaSimple(LoadingState, mockHandlers), { wrapper: StrictMode }
        )

        act(() => {
            result.current[1].started_loading({ now: 1000 })
        })

        expect(mockHandlers.startLoadingAnimation).toHaveBeenCalledTimes(1);
        expect(result.current[0]).toEqual({ state: 'loading', loadingStarted: 1000 })
    })

    it("happy path", () => {
        const mockHandlers = {
            startLoadingAnimation: vi.fn(),
            displayPopup: vi.fn()
        }

        const { result } = renderHook(() =>
            useTeaSimple(LoadingState, mockHandlers), { wrapper: StrictMode }
        )

        expect(result.current[0]).toEqual({ state: 'initial' })
        expect(result.current[1]).toBeDefined()

        act(() => {
            result.current[1].started_loading({ now: 1000 })
        })

        expect(result.current[0]).toEqual({ state: 'loading', loadingStarted: 1000 })
        expect(mockHandlers.startLoadingAnimation).toHaveBeenCalledTimes(1);

        act(() => {
            result.current[1].finished_loading({ now: 2000 })
        })

        expect(result.current[0]).toEqual({
            state: 'loaded',
            loadingStarted: 1000,
            loadingFinished: 2000
        })
        expect(mockHandlers.displayPopup).toHaveBeenCalledWith(
            expect.objectContaining({
                text: `Loading finished in 1000 milliseconds!`
            })
        )
    })

    it("uses latest command handlers after rerender", () => {
        const firstHandlers = {
            log: vi.fn(),
        }

        const secondHandlers = {
            log: vi.fn(),
        }
        const { result, rerender } = renderHook(
            ({ handlers }) => useTeaSimple(CounterState, handlers),
            {
                initialProps: { handlers: firstHandlers },
                wrapper: StrictMode
            }
        )

        act(() => {
            result.current[1].inc({})
        })

        expect(result.current[0]).toEqual({ state: 'active', value: 1 })
        expect(firstHandlers.log).toHaveBeenCalledTimes(1)
        expect(secondHandlers.log).not.toHaveBeenCalled()

        rerender({ handlers: secondHandlers })

        act(() => {
            result.current[1].inc({})
        })
        expect(result.current[0]).toEqual({ state: 'active', value: 2 })
        expect(secondHandlers.log).toHaveBeenCalledTimes(1)
        expect(firstHandlers.log).toHaveBeenCalledTimes(1)
    })
})


