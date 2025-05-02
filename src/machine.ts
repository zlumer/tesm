import { simpleFlow } from "./extensions"
import { cmd, ExtractValues, msg, state } from "./tesm"

type _PModelBase = Parameters<typeof state>[0]
type _PMsgBase = Parameters<typeof msg>[0]
type _PCmdBase = Parameters<typeof cmd>[0]

const _machine =
	<PModel extends _PModelBase>(states: PModel) =>
	<PMsg extends _PMsgBase>(msgs: PMsg) =>
	<PCmd extends _PCmdBase>(cmds: PCmd) => {
		return {
			states: state(states),
			msgs: msg(msgs),
			cmds: cmd(cmds),
		}
	}

export const machine = <
	PModel extends _PModelBase,
	PMsg extends _PMsgBase,
	PCmd extends _PCmdBase
>(
	states: PModel,
	msgs: PMsg,
	cmds: PCmd
) => {
	return _machine(states)(msgs)(cmds)
}

export type _MachineBase = ReturnType<typeof machine>

type FlowDescriber<
	TState extends { state: string },
	TMsg extends { type: string },
	TCmd
> = {
	[state in TState["state"]]?: {
		[msg in TMsg["type"]]?: (
			msg: Extract<
				TMsg,
				{
					type: msg
				}
			>,
			model: Extract<
				TState,
				{
					state: state
				}
			>
		) => readonly [TState, ...TCmd[]]
	}
}

type FlowDescriberExtra<
	TModel extends { state: string },
	TMsg extends { type: string },
	TCmd
> = {
	[msg in TMsg["type"]]?: (
		msg: Extract<
			TMsg,
			{
				type: msg
			}
		>,
		model: TModel
	) => readonly [TModel, ...TCmd[]]
}

export const mixin = <
	TModel extends { state: string },
	TMsg extends { type: string },
	TCmd
>(
	flow: FlowDescriber<TModel, TMsg, TCmd>,
	extras: FlowDescriberExtra<TModel, TMsg, TCmd>,
	states: TModel["state"][]
): FlowDescriber<TModel, TMsg, TCmd> => {
	if (!extras) return flow

	let copy = {} as FlowDescriber<TModel, TMsg, TCmd>
	for (let s of states) {
		let flows = (flow[s] ? { ...flow[s] } : {}) as (typeof flow)[TModel["state"]]

		for (let m in extras) {
			let handler = extras[m as TMsg["type"]]

			if (flows && !(flows as any)[m as TMsg["type"]])
				(flows as any)[m as TMsg["type"]] = handler
		}
		copy[s] = flows
	}
	return copy
}

type RawMachine = ReturnType<ReturnType<ReturnType<typeof _machine>>>
export type XModel<Machine extends RawMachine> = ExtractValues<Machine["states"]>
export type XMsg<Machine extends RawMachine> = ExtractValues<Machine["msgs"]>
export type XCmd<Machine extends RawMachine> = ExtractValues<Machine["cmds"]>

export const enhance = <Machine extends _MachineBase>(
	m: Machine,
	name: string = "",
	initial: () => readonly [XModel<Machine>, ...XCmd<Machine>[]],
	flow: FlowDescriber<XModel<Machine>, XMsg<Machine>, XCmd<Machine>>,
	extras: FlowDescriberExtra<XModel<Machine>, XMsg<Machine>, XCmd<Machine>> = {}
) => {
	return {
		...m,
		initial,
		update: simpleFlow<XModel<Machine>, XMsg<Machine>, XCmd<Machine>>(
			name,
			mixin(flow, extras, Object.keys(m.states))
		),
	}
}
