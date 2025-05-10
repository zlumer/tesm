import { FlowDescriber } from "./utils/machine"

export function throwInvalidInFlow<TMsg, TModel, TCmd>(
	upd: (msg: TMsg, model: TModel) => readonly [TModel, ...TCmd[]] | undefined,
	err: (msg: TMsg, model: TModel) => never
): (msg: TMsg, model: TModel) => readonly [TModel, ...TCmd[]] {
	return (msg: TMsg, model: TModel) => {
		let ret = upd(msg, model)
		if (!ret) return err(msg, model)

		return ret
	}
}

export function simpleFlowNoThrow<
	TState extends { state: string },
	TMsg extends { type: string },
	TCmd
>(
	obj: FlowDescriber<TState, TMsg, TCmd>
): (msg: TMsg, model: TState) => readonly [TState, ...TCmd[]] | undefined {
	return (msg: TMsg, model: TState) => {
		if (model.state in obj) {
			let msgs = obj[model.state as TState["state"]]!
			if (msg.type in msgs) {
				let upd = msgs[msg.type as TMsg["type"]]!
				return upd(msg as any, model as any)
			}
		}
		return undefined
	}
}

export const invalid_state = <T extends { state: string }, G extends { type: string }>(
	machine: string,
	msg: G,
	model: T
): never => {
	throw new Error(
		`[STATE MACHINE] unhandled state! ${machine}/${model.state}.${msg.type
		}()\n${JSON.stringify(msg)}`
	)
}

export function simpleFlow<
	TState extends { state: string },
	TMsg extends { type: string },
	TCmd
>(
	machine: string,
	obj: FlowDescriber<TState, TMsg, TCmd>
): (msg: TMsg, model: TState) => readonly [TState, ...TCmd[]] {
	return throwInvalidInFlow(simpleFlowNoThrow(obj), (msg, model) =>
		invalid_state(machine, msg, model)
	)
}


export function subupdate<Msg, Cmd, Model, TM, TC, TMD>(
	extractMsg: (m: Msg) => TM,
	wrapCmd: (c: TC) => Cmd,
	extractSubmodel: (m: Model) => TMD,
	wrapSubmodule: (m: Model, t: TMD) => Model,
	update: (m1: TM, m2: TMD) => readonly [TMD, ...TC[]]
): (msg: Msg, model: Model) => readonly [Model, ...Cmd[]] {
	return (msg: Msg, model: Model) => {
		let [submodel, ...cs] = update(extractMsg(msg), extractSubmodel(model))
		return [
			(submodel == extractSubmodel(model)) ? model : wrapSubmodule(model, submodel),
			...cs.map(x => wrapCmd(x))
		]
	}
}

export function splitApply<T, U, A, B>(arr: readonly [T, ...U[]], head: (t: T) => A, tail: (u: U) => B): [A, ...B[]] {
	let [t, ...us] = arr
	return [
		head(t),
		...us.map(u => tail(u))
	]
}
