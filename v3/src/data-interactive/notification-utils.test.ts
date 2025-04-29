import { DEBUG_PLUGINS, debugLog } from "../lib/debug"
import { makeCallback, notification } from "./notification-utils"

jest.mock("../lib/debug", () => ({
  debugLog: jest.fn()
}))

describe("makeCallback", () => {
  it("should create a callback function that logs the response", () => {
    const operation = "testOperation"
    const other = "testOther"
    const response = { success: true }
    const callback = makeCallback(operation, other)

    callback(response)

    expect(debugLog).toHaveBeenCalledWith(
      DEBUG_PLUGINS,
      `Reply to notify ${operation} ${other}`,
      JSON.stringify(response)
    )
  })
})

describe("notification", () => {
  it("should create a notification object with the correct properties", () => {
    const operation = "testOperation"
    const resource = "component"
    const values = { operation, testKey: "testValue" }
    const callback = jest.fn()

    const result = notification(resource, values, callback)

    expect(result).toEqual({
      message: {
        action: "notify",
        resource: "component",
        values: {
          ...values,
          operation
        }
      },
      callback: expect.any(Function)
    })
  })
})
