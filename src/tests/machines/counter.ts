import { machine, enhance, XModel, XMsg, XCmd } from "../../utils/machine";
import { st } from "../../utils/misc";

type CounterContext = {
    value: number
}

const m = machine(
    {
        active: st<CounterContext>()
    },
    {
        inc: () => ({}),
        dec: () => ({}),
        reset: () => ({})
    },
    {
        log: (message: string) => ({ message })
    }
)

export const CounterState = enhance(m, "CounterState", () => [m.states.active({ value: 0 })], {
    active: {
        inc(_, model) {
            const newValue = model.value + 1
            return [
                m.states.active({ value: newValue }),
                m.cmds.log(`Value increased to ${newValue}`)
            ]
        },
        dec(_, model) {
            const newValue = model.value - 1
            return [
                m.states.active({ value: newValue }),
                m.cmds.log(`Value decreased to ${newValue}`)
            ]
        },
        reset() {
            return [
                m.states.active({ value: 0 }),
                m.cmds.log('Counter reset to 0')
            ]
        }
    }
})

export type Msg = XMsg<typeof m>
export type Cmd = XCmd<typeof m>
export type Model = XModel<typeof m>

