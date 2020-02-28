export function simpleFlow<
	TState extends {state: string},
	TMsg extends {type: string},
	TCmd
>(
	obj: { [state in TState["state"]]?: {
		[msg in TMsg["type"]]?: (
			msg: Extract<TMsg, { type: msg }>,
			model: Extract<TState, { state: state }>
		) => [TState, ...TCmd[]]
	}}
): (msg: TMsg, model: TState) => [TState, ...TCmd[]] | undefined
{
	return (msg: TMsg, model: TState) =>
	{
		if (model.state in obj)
		{
			let msgs = obj[model.state as TState["state"]]!
			if (msg.type in msgs)
			{
				let upd = msgs[msg.type as TMsg["type"]]!
				return upd(msg as any, model as any)
			}
		}
	}
}

export function mandatoryFlow<
	TState extends {state: string},
	TMsg extends {type: string},
	TCmd
>(obj: { [state in TState["state"]]: {
	[msg in TMsg["type"]]: (
		msg: Extract<TMsg, { type: msg }>,
		model: Extract<TState, { state: state }>
	) => [TState, ...TCmd[]]
}}): (msg: TMsg, model: TState) => [TState, ...TCmd[]]
{
	return simpleFlow(obj) as any
}

export function subupdate<Msg, Cmd, Model, TM, TC, TMD>(
	extractMsg: (m: Msg) => TM,
	wrapCmd: (c: TC) => Cmd,
	extractSubmodel: (m: Model) => TMD,
	wrapSubmodule: (m: Model, t: TMD) => Model,
	update: (m1: TM, m2: TMD) => [TMD, ...TC[]]
): (msg: Msg, model: Model) => [Model, ...Cmd[]]
{
	return (msg: Msg, model: Model) =>
	{
		let [submodel, ...cs] = update(extractMsg(msg), extractSubmodel(model))
		return [
			(submodel == extractSubmodel(model)) ? model : wrapSubmodule(model, submodel),
			...cs.map(x => wrapCmd(x))
		]
	}
}
