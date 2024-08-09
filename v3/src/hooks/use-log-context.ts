// import { createContext, useContext } from "react"
import { ILogMessage } from "../models/history/apply-model-change"

const gPendingLogMessages = new Map<string, ILogMessage>()

function getPendingLogMessage(key: string) {
  console.log("in getPendingLogMessage key", key)
  const message = gPendingLogMessages.get(key)
  gPendingLogMessages.delete(key)
  return message
}

function setPendingLogMessage(key: string, message: ILogMessage) {
  console.log("in setPendingLogMessage key", key)
  gPendingLogMessages.set(key, message)
}


export function useLoggingContext() {
  return { getPendingLogMessage, setPendingLogMessage }
}

// interface ILogContext {
//   getPendingLogMessage: (key: string) => ILogMessage | undefined
//   setPendingLogMessage: (key: string, message: ILogMessage) => void
// }

// export const LoggingContext = createContext<ILogContext>({ getPendingLogMessage, setPendingLogMessage })
// export const useLoggingContext = () => useContext(LoggingContext)
