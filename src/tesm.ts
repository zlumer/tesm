import { _MachineBase, XCmd } from "./utils/machine"

type FunctionMap<T extends any> = T extends { [key: string]: (...args: any[]) => any } ? T : any

export type ExtractValues<T extends any> = ReturnType<FunctionMap<T>[keyof T]>


export const keys = <T extends {}>(obj: T): { [k in keyof T]: k } => Object.keys(obj).reduce((acc, key) => ({ ...acc, [key]: key }), {} as { [k in keyof T]: k })

const withState = <T extends string, TArgs extends any[], U extends {}>(state: T, f: (...args: TArgs) => U): (...args: TArgs) => U & { state: T } => {
	// duplicate `{ state }` to make sure we print it first in debug console. not effective
	return (...args) => Object.assign({ state }, f(...args), { state })
}
export type StateMap<T extends any> = { [key in keyof T]: (...args: Parameters<FunctionMap<T>[key]>) => (ReturnType<FunctionMap<T>[key]> & { state: key }) }
const mapWithState = <K extends string, T extends { [key in K]: (...args: any[]) => any }>(obj: T) => {
	let o2 = {} as any
	for (let s in obj) {
		o2[s] = withState(s, obj[s] as any)
	}
	return o2 as StateMap<T>
}

const withType = <T extends string, TArgs extends any[], U extends {}>(type: T, f: (...args: TArgs) => U): (...args: TArgs) => U & { type: T } => {
	return (...args) => Object.assign(f(...args), { type })
}
export type TypedMap<T extends any> = { [key in keyof T]: (...args: Parameters<FunctionMap<T>[key]>) => (ReturnType<FunctionMap<T>[key]> & { type: key }) }
const mapWithType = <K extends string, T extends { [key in K]: (...args: any[]) => any }>(obj: T) => {
	let o2 = {} as any
	for (let s in obj) {
		o2[s] = withType(s, obj[s] as any)
	}
	return o2 as TypedMap<T>
}

export const state = mapWithState
export const cmd = mapWithType
export const msg = mapWithType


type FuncMap<T extends string> = {
	[key in T]: (...args: any[]) => unknown
}

export const createSubMsg = <SubMsgMap extends FuncMap<string>>(subMsgs: SubMsgMap) =>
	<
		SubMsg extends { type: string },
		RootMsg extends { type: string }
	>(wrap: (msg: SubMsg) => RootMsg) => (() => {
		let o2 = {} as any
		for (let s in subMsgs) {
			let t = s as SubMsg["type"]
			let m = subMsgs[t] as any
			o2[s] = (...args: any[]) => wrap(m(...args as any))
		}
		return o2 as { [key in SubMsg["type"]]: (...args: Parameters<SubMsgMap[key]>) => RootMsg }
	})()

export const createMsgCreator = <MsgMap extends FuncMap<string>>(subMsgs: MsgMap) =>
	<
		Msg extends { type: string } & ReturnType<MsgMap[keyof MsgMap]>
	>(send: (msg: Msg) => void) => (() => {
		let o2 = {} as any
		for (let s in subMsgs) {
			let t = s as Msg["type"]
			let m = subMsgs[t] as any
			o2[s] = (...args: any[]) => send(m(...args as any))
		}
		return o2 as { [key in Msg["type"]]: (...args: Parameters<MsgMap[key]>) => void }
	})()


export type CmdFuncs<Cmd extends { type: string }, MsgCreator> = {
	[key in Cmd["type"]]: (cmd: Extract<Cmd, { type: key }>, msgs: MsgCreator) => void
}
export type CmdHandler<Cmd extends { type: string }, MsgCreator> = (msgs: MsgCreator) => (cmd: Cmd) => void

export function createHandler<
	Model extends { state: string },
	Msg extends { type: string },
	Cmd extends { type: string },
	MsgCreator
>(
	// machine is used for type inference only
	machine: {
		initial: () => readonly [Model, ...Cmd[]]
		update: (msg: Msg, state: Model) => readonly [Model, ...Cmd[]]
		msgCreator: (send: (msg: Msg) => void) => MsgCreator,
	},
	funcs: CmdFuncs<Cmd, MsgCreator>
): CmdHandler<Cmd, MsgCreator> {
	return (msgs) => (cmd) => {
		const handler = funcs[cmd.type as Cmd["type"]]
		return handler?.(cmd as any, msgs)
	}
}

export type CmdHandlerFactory<Cmd extends { type: string }, Params extends object, MsgCreator> = (params: Params) => CmdHandler<Cmd, MsgCreator>

export function createHandlerF<
	Params extends object,
	Model extends { state: string },
	Msg extends { type: string },
	Cmd extends { type: string },
	MsgCreator
>(machine: {
	initial: () => readonly [Model, ...Cmd[]]
	update: (msg: Msg, state: Model) => readonly [Model, ...Cmd[]]
	msgCreator: (send: (msg: Msg) => void) => MsgCreator,
}, f: (params: Params) => CmdFuncs<Cmd, MsgCreator>): CmdHandlerFactory<Cmd, Params, MsgCreator> {
	return (params: Params) => createHandler(machine, f(params))
}

export function msgErr(f: (m: { error: unknown }) => void) {
	return (error: unknown) => {
		f({ error })
	}
}