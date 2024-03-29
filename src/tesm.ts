type FunctionMap<T extends any> = T extends {[key: string]: (...args: any[]) => any} ? T : any

export type ExtractValues<T extends any> = ReturnType<FunctionMap<T>[keyof T]>

export const keys = <T extends {}>(obj: T): { [k in keyof T]: k } => Object.keys(obj).reduce((acc, key) => ({...acc, [key]: key}), {} as {[k in keyof T]: k})

const withState = <T extends string, TArgs extends any[], U extends {}>(state: T, f: (...args: TArgs) => U): (...args: TArgs) => U & { state: T } =>
{
	// duplicate `{ state }` to make sure we print it first in debug console. not effective
	return (...args) => Object.assign({ state }, f(...args), { state })
}
export type StateMap<T extends any> = { [key in keyof T]: (...args: Parameters<FunctionMap<T>[key]>) => (ReturnType<FunctionMap<T>[key]> & { state: key }) }
const mapWithState = <K extends string, T extends { [key in K]: (...args: any[]) => any }>(obj: T) =>
{
	let o2 = {} as any
	for (let s in obj)
	{
		o2[s] = withState(s, obj[s] as any)
	}
	return o2 as StateMap<T>
}

const withType = <T extends string, TArgs extends any[], U extends {}>(type: T, f: (...args: TArgs) => U): (...args: TArgs) => U & { type: T } =>
{
	return (...args) => Object.assign(f(...args), { type })
}
export type TypedMap<T extends any> = { [key in keyof T]: (...args: Parameters<FunctionMap<T>[key]>) => (ReturnType<FunctionMap<T>[key]> & { type: key }) }
const mapWithType = <K extends string, T extends { [key in K]: (...args: any[]) => any }>(obj: T) =>
{
	let o2 = {} as any
	for (let s in obj)
	{
		o2[s] = withType(s, obj[s] as any)
	}
	return o2 as TypedMap<T>
}

export const state = mapWithState
export const cmd = mapWithType
export const msg = mapWithType


export const invalid_state = <T extends { state: string }, G extends { type: string }>(machine: string, msg: G, model: T): never =>
{
	throw new Error(`[STATE MACHINE] unhandled state! ${machine}/${model.state}.${msg.type}()\n${JSON.stringify(msg)}`)
}

export const createHookRaw = <
	Model extends { state: string },
	Msg extends { type: string },
	Cmd extends { type: string }
>(
	update: (msg: Msg, model: Model) => readonly [Model, ...Cmd[]]
) =>
	(initialState: () => Model, keepHistory = -1) =>
{
	let state = initialState()
	let history: [Model, Msg, Model, ...Cmd[]][] = []
	function sendMsg(msg: Msg): /* [Msg, Model, Model, ... */readonly Cmd[]/* ] */
	{
		try
		{
			let oldState = state
			let [m, ...cmds] = update(msg, state)
			if (!cmds)
				cmds = []
			
			if (keepHistory != 0)
				history.push([oldState, msg, m, ...cmds])
			
			if ((keepHistory > 0) && (keepHistory < history.length))
				history.shift()
			
			state = m
			return /* [msg, oldState, m, ... */cmds/* ] */
		}
		catch (e)
		{
			throw e
		}
		
	}
	return {
		getState: () => state,
		getHistory: () => history,
		send: sendMsg,
	}
}
export const createHook = <
	Model extends { state: string },
	Msg extends { type: string },
	Cmd extends { type: string }
>(
	update: (msg: Msg, model: Model) => readonly [Model, ...Cmd[]]
) =>
	(initialState: () => Model) =>
{
	type HandlerAny = (cmd: Cmd, oldModel: Model, newModel: Model, msg: Msg) => void

	let hook = createHookRaw(update)(initialState)

	let handlers: HandlerAny[] = []
	const sendWithHandlers = (msg: Msg) =>
	{
		// console.log(`handler: ${msg.type}`)
		let oldState = hook.getState()
		let cmds = hook.send(msg)
		let newState = hook.getState()
		cmds.forEach(cmd => handlers.forEach(h => h(cmd, oldState, newState, msg)))
		return cmds
	}

	let h = {
		getState: hook.getState,
		getHistory: hook.getHistory,
		_send: hook.send,
		send: sendWithHandlers,
		tryMsg: (msg: Msg) => update(msg, hook.getState()),
	}
	return {
		...h,
		addHandler: (h: HandlerAny) =>
		{
			handlers.push(h)
		},
		removeHandler: (h: HandlerAny) =>
		{
			let idx = handlers.indexOf(h)
			if (idx >= 0)
				handlers.splice(idx, 1)
		},
		removeAllHandlers()
		{
			handlers = []
		}
	}
}

type FuncMap<T extends string> = {
	[key in T]: (...args: any[]) => unknown
}

export const createSubMsg = <SubMsgMap extends FuncMap<string>>(subMsgs: SubMsgMap) =>
<
	SubMsg extends { type: string },
	RootMsg extends { type: string }
>(wrap: (msg: SubMsg) => RootMsg) => (() =>
{
	let o2 = {} as any
	for (let s in subMsgs)
	{
		let t = s as SubMsg["type"]
		let m = subMsgs[t] as any
		o2[s] = (...args: any[]) => wrap(m(...args as any))
	}
	return o2 as {[key in SubMsg["type"]]: (...args: Parameters<SubMsgMap[key]>) => RootMsg}
})()

export const createMsgCreator = <MsgMap extends FuncMap<string>>(subMsgs: MsgMap) =>
<
	Msg extends { type: string } & ReturnType<MsgMap[keyof MsgMap]>
>(send: (msg: Msg) => void) => (() =>
{
	let o2 = {} as any
	for (let s in subMsgs)
	{
		let t = s as Msg["type"]
		let m = subMsgs[t] as any
		o2[s] = (...args: any[]) => send(m(...args as any))
	}
	return o2 as {[key in Msg["type"]]: (...args: Parameters<MsgMap[key]>) => void}
})()
