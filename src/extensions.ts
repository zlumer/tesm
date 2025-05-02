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
		`[STATE MACHINE] unhandled state! ${machine}/${model.state}.${
			msg.type
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
