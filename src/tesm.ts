export type ExtractValues<T extends any> = ReturnType<FunctionMap<T>[keyof T]>

export function createHandler<Cmd extends { type: string }>(funcs: {
	[key in Cmd["type"]]: (cmd: Extract<Cmd, { type: key }>) => void
}) {
	return (cmd: Cmd) => {
		// console.log("handling", cmd)

		const handler = funcs[cmd.type as Cmd["type"]]
		return handler?.(cmd as any)
	}
}

export function msgErr(f: (m: { error: unknown }) => void) {
	return (error: unknown) => {
		f({ error })
	}
}

type FunctionMap<T extends any> = T extends { [key: string]: (...args: any[]) => any }
	? T
	: any

const withState = <T extends string, TArgs extends any[], U extends {}>(
	state: T,
	f: (...args: TArgs) => U
): ((...args: TArgs) => U & { state: T }) => {
	// duplicate `{ state }` to make sure we print it first in debug console. not effective
	return (...args) => Object.assign({ state }, f(...args), { state })
}
export type StateMap<T extends any> = {
	[key in keyof T]: (
		...args: Parameters<FunctionMap<T>[key]>
	) => ReturnType<FunctionMap<T>[key]> & { state: key }
}
const mapWithState = <
	K extends string,
	T extends { [key in K]: (...args: any[]) => any }
>(
	obj: T
) => {
	let o2 = {} as any
	for (let s in obj) {
		o2[s] = withState(s, obj[s] as any)
	}
	return o2 as StateMap<T>
}

const withType = <T extends string, TArgs extends any[], U extends {}>(
	type: T,
	f: (...args: TArgs) => U
): ((...args: TArgs) => U & { type: T }) => {
	return (...args) => Object.assign(f(...args), { type })
}
export type TypedMap<T extends any> = {
	[key in keyof T]: (
		...args: Parameters<FunctionMap<T>[key]>
	) => ReturnType<FunctionMap<T>[key]> & { type: key }
}
const mapWithType = <K extends string, T extends { [key in K]: (...args: any[]) => any }>(
	obj: T
) => {
	let o2 = {} as any
	for (let s in obj) {
		o2[s] = withType(s, obj[s] as any)
	}
	return o2 as TypedMap<T>
}

export const state = mapWithState
export const cmd = mapWithType
export const msg = mapWithType
