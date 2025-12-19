import { useCallback, useLayoutEffect, useMemo, useSyncExternalStore } from "react"
import { CmdFuncs, CmdHandler, createHandler } from "../tesm"
import { createHook } from "../hook"

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
	cmds: CmdHandler<Cmd, MsgCreator> | CmdFuncs<Cmd, MsgCreator>
): readonly [
	Model,
	MsgCreator
] {
	// Either a function that returns a handler (e.g. createHandlerF) or a handler directly  
	const handler = typeof cmds === "object" ? createHandler(cmds) : cmds

	const hook = useMemo(() => createHook(machine.update)(machine.initial), [machine.initial, machine.update])

	const state = useSyncExternalStore(
		hook.subscribe,
		hook.getState
	)

	const dispatch = useCallback(hook.send, [hook])

	const msgs = useMemo(() => machine.msgCreator(dispatch), [dispatch])

	useLayoutEffect(() => {
		return hook.addHandler(handler(msgs))
	}, [hook, handler, msgs])

	return useMemo(() => [state, msgs] as const, [state, msgs])
}
