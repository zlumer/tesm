import { machine, XMsg, XCmd, XModel, enhanceMachine } from "../../utils/machine"
import { st } from "../../utils/misc"

type InitialContext = {}

type LoadingContext = {
    loadingStarted: number
}
type LoadedContext = LoadingContext & {
    loadingFinished: number
}

const m = machine(
    {
        initial: st<InitialContext>(),
        loading: st<LoadingContext>(),
        loaded: st<LoadedContext>(),
    },
    {
        started_loading: (now: number) => ({ now }),
        finished_loading: (now: number) => ({ now }),
    },
    {
        startLoadingAnimation: () => ({}),
        displayPopup: (text: string) => ({ text }),
    }
)

export type Msg = XMsg<typeof m>
export type Cmd = XCmd<typeof m>
export type Model = XModel<typeof m>

export const LoadingState = enhanceMachine(
    m,
    "LoadingState",
    () => [m.states.initial({})],
    {
        initial: {
            started_loading: (msg, model) => [
                m.states.loading({ loadingStarted: msg.now }),
                m.cmds.startLoadingAnimation(),
            ],
        },
        loading: {
            finished_loading: (msg, model) => [
                m.states.loaded({
                    loadingStarted: model.loadingStarted,
                    loadingFinished: msg.now,
                }),
                m.cmds.displayPopup(
                    `Loading finished in ${msg.now - model.loadingStarted} milliseconds!`
                ),
            ],
        },
        loaded: {}
    })
