import { useCallback, useLayoutEffect, useMemo, useSyncExternalStore } from "react"
import { createHandler } from "../tesm"
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

	useLayoutEffect(() => {
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
	Cmd extends { type: string },
	MsgCreator
>(
	machine: {
		initial: () => readonly [Model, ...Cmd[]]
		update: (msg: Msg, state: Model) => readonly [Model, ...Cmd[]]
		msgCreator: (send: (msg: Msg) => void) => MsgCreator,
	},
	cmds: { [key in Cmd["type"]]: (cmd: Extract<Cmd, { type: key }>) => any }
): readonly [
	Model,
	MsgCreator
] {
	const handler = createHandler(cmds)
	const [state, dispatch] = useTea(machine.initial, machine.update, handler)
	const msgs = useMemo(() => machine.msgCreator(dispatch), [dispatch])
	return useMemo(() => [state, msgs] as const, [state, msgs])
}
