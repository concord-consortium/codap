import { t } from "../utilities/translation/translate"
import { AnalyticsCategory } from "./analytics"

export type LoggableValue = string | number | boolean | undefined
export type LoggableObject = Record<string, LoggableValue>

export interface ILogMessage {
  message: string
  args?: LoggableObject
  category?: AnalyticsCategory;
}

export interface ILogFunctionEnv {
  log: (message: ILogMessage) => void
}

export type LogMessageFn = () => ILogMessage

// e.g. logMessageWithReplacement("Moved category %@ into position of %@", { movedCat: string, targetCat: string })
export function logMessageWithReplacement(message: string, args: LoggableObject,
                    category?: AnalyticsCategory): ILogMessage {
  return { message: t(message, { vars: Object.values(args) }), args, category }
}

export function stringify(obj: LoggableObject | object) {
  const values = Object.entries(obj).map(([key, value]) => `${key}: ${value}`).join(", ")
  return `{ ${values} }`
}

// e.g. logStringifiedObjectMessage("dragEnd: %@", { lower: number, upper: number })
export function logStringifiedObjectMessage(message: string, args: LoggableObject,
            category?: AnalyticsCategory): ILogMessage {
  return { message: t(message, { vars: [stringify(args)] }), args, category }
}

// Call this function before the change occurs to capture the initial model state.
// Pass the returned function to applyModelChange, which will call it after the change
// to capture the final values and generate the log message.
// e.g. logModelChange("Moved equation from (%@, %@) to (%@, %@)", () => lines?.[lineIndex]?.equationCoords)
type ModelStateFn = (arg?: any) => LoggableObject
interface LMCOptions {
  initialArg?: any
  initialKeyFn?: (finalKey: string) => string
}
export function logModelChangeFn(message: string, modelStateFn: ModelStateFn, options?: LMCOptions,
                    category?: AnalyticsCategory): LogMessageFn {
  const { initialArg, initialKeyFn = ((key: string) => `${key}Initial`) } = options || {}
  // capture the relevant initial state of the model
  const initial = modelStateFn(initialArg)
  return (finalArg?: any) => {
    // capture the relevant final state of the model
    const final = modelStateFn(finalArg)
    // combine initial and final values as replacement string values
    const vars = [...Object.values(initial), ...Object.values(final)]
    // append `Initial` to property names of initial values
    const argsInitial = Object.fromEntries(Object.entries(initial).map(([key, value]) => [initialKeyFn(key), value]))
    // final logged object contains initial and final values
    const args = { ...argsInitial, ...final }
    return { message: t(message, { vars }), args, category }
  }
}
