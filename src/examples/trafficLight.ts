// #region full
import { machine, st, XMsg, XModel, XCmd, enhance } from "tesm"


const GREEN_DURATION = 30000;
const YELLOW_DURATION = 5000;
const RED_DURATION = 25000;

type BaseContext = {
    lastChanged: number;
    cycleCount: number;
}

type GreenContext = BaseContext
type YellowContext = BaseContext
type RedContext = BaseContext

const m = machine(
    {
        green: st<GreenContext>(),
        yellow: st<YellowContext>(),
        red: st<RedContext>(),
    },
    {
        timer_elapsed: (timestamp: number) => ({ timestamp }),
        reset: () => ({}),
    },
    {
        scheduleNextChange: (delayMs: number) => ({ delayMs }),
        logChange: (from: string, to: string, timestamp: number) => ({ from, to, timestamp }),
    }
)

// #region example
const TrafficLightState = enhance(
    m,
    "TrafficLight",
    () => [
        m.states.green({ lastChanged: Date.now(), cycleCount: 0 }),
        m.cmds.scheduleNextChange(GREEN_DURATION)
    ],
    {
        green: {
            timer_elapsed: (msg, model) => [
                m.states.yellow({ lastChanged: msg.timestamp, cycleCount: model.cycleCount }),
                m.cmds.scheduleNextChange(YELLOW_DURATION),
                m.cmds.logChange('green', 'yellow', msg.timestamp)
            ],
        },
        yellow: {
            timer_elapsed: (msg, model) => [
                m.states.red({ lastChanged: msg.timestamp, cycleCount: model.cycleCount }),
                m.cmds.scheduleNextChange(RED_DURATION),
                m.cmds.logChange('yellow', 'red', msg.timestamp)
            ],
        },
        red: {
            timer_elapsed: (msg, model) => [
                m.states.green({ lastChanged: msg.timestamp, cycleCount: model.cycleCount + 1 }),
                m.cmds.scheduleNextChange(GREEN_DURATION),
                m.cmds.logChange('red', 'green', msg.timestamp)
            ],
        }
    },
    {
        reset: (msg, model) => [
            m.states.green({ lastChanged: Date.now(), cycleCount: 0 }),
            m.cmds.scheduleNextChange(GREEN_DURATION),
            m.cmds.logChange(model.state, 'green', Date.now())
        ]
    }
)
// #endregion example

export namespace TrafficLight {
    export type Msg = XMsg<typeof m>
    export type Cmd = XCmd<typeof m>
    export type Model = XModel<typeof m>
    export const machine = TrafficLightState
}
// #endregion full