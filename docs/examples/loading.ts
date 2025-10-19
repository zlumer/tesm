// #region completeCode
// #region import
import { machine, st, XMsg, XModel, XCmd, enhanceMachine } from "tesm"
// #endregion import 

// #region types
type InitialContext = {}

type LoadingContext = {
    loadingStarted: number
}
type LoadedContext = LoadingContext & {
    loadingFinished: number
}
// #endregion types

// #region part1
// #region part2
// #region part3
const m = machine(
    {
        initial: st<InitialContext>(),
        loading: st<LoadingContext>(),
        loaded: st<LoadedContext>(),
    },
    // #endregion part1
    {
        started_loading: (now: number) => ({ now }),
        finished_loading: (now: number) => ({ now }),
    },
    // #endregion part2
    {
        startLoadingAnimation: () => ({}),
        displayPopup: (text: string) => ({ text }),
    }
    // #endregion part3
)

// #region extractedTypes
export type Msg = XMsg<typeof m>
export type Cmd = XCmd<typeof m>
export type Model = XModel<typeof m>
// #endregion extractedTypes

// #region enhanced
export const LoadingState = enhanceMachine(
    m, // our machine 
    "LoadingState", // machine name for debug
    () => [m.states.initial({})], // initial state and commands
    {
        initial: {
            // #region focus
            started_loading: (msg, model) => [
                m.states.loading({ loadingStarted: msg.now }),
                m.cmds.startLoadingAnimation(),
            ],
            // #endregion focus
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
// #endregion enhanced
// #endregion completeCode
