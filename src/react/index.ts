import { Dispatch, useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react"
import { createHandler } from "../tesm"
import { useEvent } from "react-use-event-hook"
import { createHook } from "../hook"


/**
 * React Hook that creates a TEA-like reducer from State, Msg, and Cmd
 */
export function useTea<
	Model extends { state: string },
	Msg extends { type: string },
	Cmd extends { type: string }
>(
	init: () => readonly [Model, ...Cmd[]],
	update: (msg: Msg, state: Model) => readonly [Model, ...Cmd[]],
	handleCmd: (cmd: Cmd) => void
): [Model, (msg: Msg) => void] {
	const hook = useMemo(() => createHook(update)(init), [init, update])

	useEffect(() => {
		return hook.addHandler(handleCmd)
	}, [handleCmd])

	const state = useSyncExternalStore(
		hook.subscribe,
		hook.getState
	)

	const dispatch = useCallback(hook.send, [hook])


	return [state, dispatch]
}

export function useTeaSimple<
	Model extends { state: string },
	Msg extends { type: string },
	Cmd extends { type: string }
>(
	machine: {
		initial: () => readonly [Model, ...Cmd[]]
		update: (msg: Msg, state: Model) => readonly [Model, ...Cmd[]]
	},
	cmds: { [key in Cmd["type"]]: (cmd: Extract<Cmd, { type: key }>) => any }
): readonly [
	Model,
	{
		[key in Msg["type"]]: (
			params: Omit<Extract<Msg, { type: key }>, "type">
		) => Extract<Msg, { type: key }>
	}
] {
	const handler = useEvent(createHandler(cmds))
	const [state, dispatch] = useTea(machine.initial, machine.update, handler)
	const msgs = useMemo(() => createMsgs(dispatch), [dispatch])
	const res = useMemo(() => [state, msgs] as const, [state, msgs])
	return res
}

export type MsgsProxy<Msg extends { type: string }> = {
	[key in Msg["type"]]: (
		params: Omit<Extract<Msg, { type: key }>, "type">
	) => Extract<Msg, { type: key }>
}
export function createMsgs<Msg extends { type: string }>(
	dispatch: Dispatch<Msg>
): MsgsProxy<Msg> {
	let proxy = new Proxy(
		{},
		{
			get(target, prop) {
				return (params: any) => {
					// console.log("dispatching", prop, params)
					dispatch({ type: prop as string, ...params })
				}
			},
		}
	)
	return proxy as any
}

