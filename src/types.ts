export type FlowDescriber<TState extends { state: string }, TMsg extends { type: string }, TCmd> = {
	[state in TState["state"]]?: {
		[msg in TMsg["type"]]?: (msg: Extract<TMsg, {
			type: msg;
		}>, model: Extract<TState, {
			state: state;
		}>) => readonly [TState, ...TCmd[]];
	};
}