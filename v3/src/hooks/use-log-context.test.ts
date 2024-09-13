import { useLoggingContext } from "./use-log-context"
import { ILogMessage } from "../lib/log-message"

describe("useLoggingContext", () => {
  const { getPendingLogMessage, setPendingLogMessage } = useLoggingContext()

  it("should set and get a pending log message", () => {
    const key = "test-key"
    const message: ILogMessage = {message: "test message"}

    setPendingLogMessage(key, message)
    const retrievedMessage = getPendingLogMessage(key)
    expect(retrievedMessage).toEqual(message)
  })

  it("should return undefined if the key does not exist", () => {
    const key = "non-existent-key"
    const retrievedMessage = getPendingLogMessage(key)
    expect(retrievedMessage).toBeUndefined()
  })
})
