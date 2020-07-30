import { SpecificMsg, SpecificState } from "./misc"
import { splitApply, simpleFlow } from "../extensions"
import { createMsgCreator, ExtractValues, cmd, msg, state } from "../tesm"

export const lensSetter = <T, U, V extends T = T>(set: (t: T, u: U) => V) =>
	<SubCmd, Cmd>(convert: (c: SubCmd) => Cmd) =>
		(model: T, data: readonly [U, ...SubCmd[]]) =>
			splitApply(data, u => set(model, u), convert)

export const sublens = <Model, SubModel>(get: (t: Model) => SubModel, set: (t: Model, u: SubModel) => Model) =>
	<Cmd, SubCmd, SubMsg, Msg extends { msg: SubMsg }>(
		update: (msg: SubMsg, model: SubModel) => readonly [SubModel, ...SubCmd[]],
		convert: (c: SubCmd) => Cmd
	) => (msg: Msg, model: Model) => splitApply(
		update(msg.msg, get(model)),
		u => set(model, u),
		convert
	)

export const submsg = <Msg>() => (msg: Msg) => ({ msg })
export const subcmd = <Cmd>() => (cmd: Cmd) => ({ cmd })

// type CleanState<T extends { state: string }> = Omit<T, "state">

export const substate = <PreModel extends { state: string }, Model extends PreModel, SubModel>(
	get: (t: Model) => SubModel,
	set: (t: Model, u: SubModel) => Model
) =>
	<Cmd, SubCmd, SubMsg, Msg extends { msg: SubMsg }>(
		init: () => readonly [SubModel, ...SubCmd[]],
		update: (msg: SubMsg, model: SubModel) => readonly [SubModel, ...SubCmd[]],
		convert: (c: SubCmd) => Cmd
	) => ({
		init: (merge: (u: SubModel) => Model) =>
			splitApply(init(), merge, convert),
		update: (msg: Msg, model: Model) => splitApply(
			update(msg.msg, get(model)),
			u => set(model, u),
			convert
		)
	})

export const sublensField = <Model>() =>
	<Field extends keyof Model>(field: Field) =>
		sublens<Model, Model[Field]>(t => t[field], (t, u) => ({ ...t, [field]: u }))

const _machine = <PModel extends _PModelBase>(states: PModel) =>
	<PMsg extends _PMsgBase>(msgs: PMsg) =>
		<PCmd extends _PCmdBase>(cmds: PCmd) =>
		{
			return {
				states: state(states),
				msgs: msg(msgs),
				cmds: cmd(cmds),
			}
		}

type RawMachine = ReturnType<ReturnType<ReturnType<typeof _machine>>>
export type XModel<Machine extends RawMachine> = ExtractValues<Machine["states"]>
export type XMsg<Machine extends RawMachine> = ExtractValues<Machine["msgs"]>
export type XCmd<Machine extends RawMachine> = ExtractValues<Machine["cmds"]>

export const skipMsg = <T, U>(f: (m: T) => U) => (_: any, m: T) => [f(m)] as const

export type _PModelBase = Parameters<typeof state>[0]
export type _PMsgBase = Parameters<typeof msg>[0]
export type _PCmdBase = Parameters<typeof cmd>[0]

export const machine = <PModel extends _PModelBase,
	PMsg extends _PMsgBase,
	PCmd extends _PCmdBase,
	>(
		states: PModel, msgs: PMsg, cmds: PCmd
	) =>
{
	// let newCmds = cmds as PCmd & { [key in keyof PSubs]: (cmd: XCmd<PSubs[key]>) => ExtractValues<PSubs[key]["cmds"]> }
	// for (let s in submachines)
	// {
	// 	let m = submachines[s]
	// 	// createSubMsg(m.cmds)()
	// }
	let m = _machine(states)(msgs)(cmds)
	return {
		...m,
		transition: <KModel extends keyof PModel, KMsg extends keyof PMsg>(
			handler: (msg: SpecificMsg<XMsg<typeof m>, KMsg>, model: SpecificState<XModel<typeof m>, KModel>) =>
				readonly [XModel<typeof m>, ...XCmd<typeof m>[]]
		) => handler,
		reinit: <KModel extends keyof PModel, KMsg extends keyof PMsg, Context extends {}>(
			init: (c: Context) => XModel<typeof m>,
			params: Context,
		) => (
			msg: SpecificMsg<XMsg<typeof m>, KMsg>,
			model: SpecificState<XModel<typeof m>, KModel>
		): [XModel<typeof m>, ...XCmd<typeof m>[]] => [
				init(params)
			],
		switch: <KModel extends keyof PModel, KMsg extends keyof PMsg, KModelNew extends keyof PModel>(
			convert: (model: SpecificState<XModel<typeof m>, KModel>) => SpecificState<XModel<typeof m>, KModelNew>,
		) =>
			(
				msg: SpecificMsg<XMsg<typeof m>, KMsg>,
				model: SpecificState<XModel<typeof m>, KModel>
			): [XModel<typeof m>, ...XCmd<typeof m>[]] => [
					convert(model)
				],
		ignore: <M extends XModel<typeof m>>(msg: XMsg<typeof m>, model: M): [XModel<typeof m>, ...XCmd<typeof m>[]] => [
			model
		],
		msgCreator: (send: (msg: XMsg<typeof m>) => void) => createMsgCreator<typeof msgs>(m.msgs as any)(send)
		/* to: {

		} as {
			[key in keyof PModel]: (XModel<typeof m>)
		} */
	}
}


type FlowDescriber<TState extends { state: string }, TMsg extends { type: string }, TCmd> = {
	[state in TState["state"]]?: {
		[msg in TMsg["type"]]?: (msg: Extract<TMsg, {
			type: msg;
		}>, model: Extract<TState, {
			state: state;
		}>) => readonly [TState, ...TCmd[]];
	};
}

type FlowDescriberExtra<TModel extends { state: string }, TMsg extends { type: string }, TCmd> = {
	[msg in TMsg["type"]]?: (msg: Extract<TMsg, {
		type: msg;
	}>, model: TModel) => readonly [TModel, ...TCmd[]];
}

export const mixin = <TModel extends { state: string }, TMsg extends { type: string }, TCmd>(
	flow: FlowDescriber<TModel, TMsg, TCmd>,
	extras: FlowDescriberExtra<TModel, TMsg, TCmd>,
	states: TModel["state"][]
): FlowDescriber<TModel, TMsg, TCmd> =>
{
	if (!extras)
		return flow

	let copy = {} as FlowDescriber<TModel, TMsg, TCmd>
	for (let s of states)
	{
		let flows = (flow[s] ? { ...flow[s] } : {}) as typeof flow[TModel["state"]]

		for (let m in extras)
		{
			let handler = extras[m as TMsg["type"]]

			if (flows && !flows[m as TMsg["type"]])
				flows[m as TMsg["type"]] = handler
		}
		copy[s] = flows
	}
	return copy
}

export type _MachineBase = ReturnType<typeof machine>

export const enhance = <
	Machine extends _MachineBase,
>(
		m: Machine,
		name: string = "",
		initial: () => readonly [XModel<Machine>, ...XCmd<Machine>[]],
		flow: FlowDescriber<XModel<Machine>, XMsg<Machine>, XCmd<Machine>>,
		extras: FlowDescriberExtra<XModel<Machine>, XMsg<Machine>, XCmd<Machine>> = {},
) =>
{
	return {
		...m,
		initial,
		update: simpleFlow<XModel<Machine>, XMsg<Machine>, XCmd<Machine>>(name, mixin(flow, extras, Object.keys(m.states))),
	}
}
