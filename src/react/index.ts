import { useState, useEffect } from "react"

export function useTesmSync<Model, Msg, Cmd>(
	update: (msg: Msg, model: Model) => readonly [Model, ...Cmd[]],
	initial: () => readonly [Model, ...Cmd[]],
	effectHandler: (cmd: Cmd, send: (msg: Msg) => void) => void,
): [Model, (msg: Msg) => void, () => void]
{
	const [[model, ...cmds], setState] = useState(() => initial())
	const send = (msg: Msg) => setState(s =>
	{
		const [model, ...oldCmds] = s
		
		const [mm, ...cmds] = update(msg, model)
		for (let cmd of oldCmds.concat(cmds))
			effectHandler(cmd, send)
		
		return [mm]
	})

	let cancelled = false
	const reset = () => setState(() => initial())

	let cancel = () => { cancelled = true }

	// console.log(`[USE-TESM]: before effect ${cmds.length}`)
	useEffect(() =>
	{
		// console.log(`[USE-TESM]: effect ${cancelled} ${cmds.length}`)
		if (cancelled)
			return cancel
		
		if (!cmds.length)
			return cancel
		
		setState([model])

		for (let cmd of cmds)
		{
			// console.log(`[USE-TESM]: cmd ${cancelled}`, cmd)
			effectHandler(cmd, send)
		}

		return cancel
	}, [cmds.length, cancelled])

	return [model, send, reset]
}
export function useTesmEasy<Model, Msg, Cmd, MsgCreator>(machine: {
		update: (msg: Msg, model: Model) => readonly [Model, ...Cmd[]],
		initial: () => readonly [Model, ...Cmd[]],
		msgCreator: (send: (msg: Msg) => void) => MsgCreator,
	},
	effectHandler: (cmd: Cmd, send: (msg: Msg) => void) => void
)
{
	return useTesmWithCreator(machine.update, machine.initial, effectHandler, machine.msgCreator)
}
export function useTesmWithCreator<Model, Msg, Cmd, MsgCreator>(
	update: (msg: Msg, model: Model) => readonly [Model, ...Cmd[]],
	initial: () => readonly [Model, ...Cmd[]],
	effectHandler: (cmd: Cmd, send: (msg: Msg) => void) => void,
	msgCreator: (send: (msg: Msg) => void) => MsgCreator
): [Model, MsgCreator, () => void]
{
	const [model, send, reset] = useTesmSync(update, initial, effectHandler)
	return [model, msgCreator(send), reset]
}
