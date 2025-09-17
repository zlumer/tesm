export type SpecificState<TModel extends { state: string }, TKey extends TModel["state"]> = Extract<TModel, { state: TKey }>
export type SpecificMsg<Msg extends { type: string }, TKey extends Msg["type"]> = Extract<Msg, { type: TKey }>
export type SpecificCmd<Cmd extends { type: string }, TKey extends Cmd["type"]> = Extract<Cmd, { type: TKey }>

export const addCmds = <Model, Cmd1, Cmd2, Cmd3, Cmd4, Cmd5, Cmd6>(
	arr: [Model, ...Cmd1[]],
	...cmds: [Cmd2?, Cmd3?, Cmd4?, Cmd5?, Cmd6?, ...(Cmd1 | Cmd2 | Cmd3 | Cmd4 | Cmd5 | Cmd6)[]]
): [Model, ...(Cmd1 | Cmd2)[]] => {
	let [head, ...tail] = arr
	return [
		head as Model,
		...tail,
		...cmds,
	] as [Model, ...(Cmd1 | Cmd2)[]]
}

export function isSpecificStateCurry<TKey extends string>(key: TKey) {
	return <TModel extends { state: string }>(model: TModel): model is SpecificState<TModel, TKey> => (model.state == key)
}

export function assertSpecificStateCurry<TKey extends string = "">(key: TKey) {
	return <TModel extends { state: string }>(model: TModel): asserts model is SpecificState<TModel, TKey> => assertSpecificState(model, key)
}

export function isSpecificState<TModel extends { state: string }, TKey extends TModel["state"]>(model: TModel, key: TKey): model is SpecificState<TModel, TKey> {
	return model.state == key
}

export function assertSpecificState<TModel extends { state: string }, TKey extends TModel["state"]>(model: TModel, key: TKey): asserts model is SpecificState<TModel, TKey> {
	if (!isSpecificState(model, key))
		throw new Error(`${model} is ${model.state}, not ${key}!`)
}

export const st =
	<T extends {}>() =>
		(m: T) =>
			m