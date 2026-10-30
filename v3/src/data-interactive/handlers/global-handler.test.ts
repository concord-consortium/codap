import { appState } from "../../models/app-state"
import { GlobalValue } from "../../models/global/global-value"
import { processAction } from "../data-interactive-request-processor"
import { DIGlobal, DIValues } from "../data-interactive-types"
import { diGlobalHandler } from "./global-handler"

describe("DataInteractive GlobalHandler", () => {
  const handler = diGlobalHandler

  const name1 = "g1"
  const value1 = 1
  const name2 = "g2"
  const value2 = 2
  it("create works as expected", () => {
    const create = (values: DIValues) => handler.create?.({}, values)

    // Values must be numbers
    expect(create({ name: name1, value: "a" })?.success).toBe(false)
    expect(create({ name: name1, value: value1 })?.success).toBe(true)

    // Names must be unique
    expect(create({ name: name1, value: value2 })?.success).toBe(false)
    expect(create({ name: name2, value: value2 })?.success).toBe(true)
  })

  it("get works as expected", () => {
    expect(handler.get?.({}).success).toBe(false)

    const global1 = GlobalValue.create({ name: name1, value: value1 })
    const values = handler.get?.({ global: global1 })?.values as DIGlobal
    expect(values.name).toBe(name1)
    expect(values.value).toBe(value1)
  })

  it("update works as expected", () => {
    const global1 = GlobalValue.create({ name: name1, value: value1 })
    const resources = { global: global1 }

    // Global and value are required
    expect(handler.update?.({}, { value: value2 }).success).toBe(false)
    expect(handler.update?.(resources, {}).success).toBe(false)

    // Value must be a number
    expect(handler.update?.(resources, { value: "a" }).success).toBe(false)

    expect(handler.update?.(resources, { value: value2 }).success).toBe(true)
    expect(global1?.value).toBe(value2)
  })

  it("update notifies plugins with global[<name>], as v2's model observer did", async () => {
    const broadcastSpy = jest.spyOn(appState.document.content!, "broadcastMessage")
    expect((await processAction({ action: "update", resource: `global[${name1}]`, values: { value: 7 } })).success)
      .toBe(true)
    const globalNotices = broadcastSpy.mock.calls.map(([message]) => message)
      .filter(message => message.resource === `global[${name1}]`)
    expect(globalNotices).toEqual([{ action: "notify", resource: `global[${name1}]`, values: { globalValue: 7 } }])
    broadcastSpy.mockRestore()
  })
})
