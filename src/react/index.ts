import { Dispatch, useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react"
import { createHandler } from "../tesm"
import { useEvent } from "react-use-event-hook"


/**
 * React Hook that creates a TEA-like reducer from State, Msg, and Cmd
 */
export function useTea<State, Msg, Cmd>(
	init: () => readonly [State, ...Cmd[]],
	update: (msg: Msg, state: State) => readonly [State, ...Cmd[]],
	handleCmd: (cmd: Cmd) => void
): [State, (msg: Msg) => void] {
	const store = useMemo(() => createTeaStore(init, handleCmd, update), [init, update, handleCmd])

	const state = useSyncExternalStore(
		store.subscribe,
		store.getState
	)

	const dispatch = useCallback(store.dispatch, [store])

	return [state, dispatch]
}

export function useTeaSimple<
	State,
	Msg extends { type: string },
	Cmd extends { type: string }
>(
	machine: {
		initial: () => readonly [State, ...Cmd[]]
		update: (msg: Msg, state: State) => readonly [State, ...Cmd[]]
	},
	cmds: { [key in Cmd["type"]]: (cmd: Extract<Cmd, { type: key }>) => any }
): readonly [
	State,
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

const createTeaStore = <State, Cmd, Msg>(init: () => readonly [State, ...Cmd[]], handleCmd: (cmd: Cmd) => void, update: (msg: Msg, state: State) => readonly [State, ...Cmd[]],) => {
	let [initState, ...initCmds] = init()

	let currentState = initState
	let listeners: (() => void)[] = []
	let cmdQueue = [...initCmds]

	const processCmdQueue = () => {
		if (cmdQueue.length > 0) {
			const [cmd] = cmdQueue
			if (cmd) {
				cmdQueue = cmdQueue.slice(1)
				handleCmd(cmd)
			}
		}
	}

	return {
		getState: () => currentState,
		subscribe: (listener: () => void) => {
			listeners.push(listener)
			return () => {
				listeners = listeners.filter(x => x !== listener)
			}
		},
		dispatch: (msg: Msg) => {
			const [newState, ...cmds] = update(msg, currentState)
			currentState = newState
			cmdQueue = [...cmdQueue, ...cmds]

			listeners.forEach(x => x())

			processCmdQueue()
		}
	}
}