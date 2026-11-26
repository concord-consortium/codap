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

    // Values must be numbers, or text that reads as one; unlike V2, booleans and empty text are refused
    const illegal = { success: false, values: { error: "global values must be numbers" } }
    for (const value of ["a", "", " ", false, true, Infinity, "Infinity", {}]) {
      expect(create({ name: name1, value } as any)).toEqual(illegal)
    }
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

    const missing = { success: false, values: { error: "missing global or value" } }

    // Global and value are required
    expect(handler.update?.({}, { value: value2 })).toEqual(missing)
    expect(handler.update?.(resources, {})).toEqual(missing)

    // Value must be a number
    expect(handler.update?.(resources, { value: "a" }))
      .toEqual({ success: false, values: { error: "global values must be numbers" } })

    expect(handler.update?.(resources, { value: value2 }).success).toBe(true)
    expect(global1?.value).toBe(value2)

    // a null value is rejected and leaves the value alone
    expect(handler.update?.(resources, { value: null })).toEqual(missing)
    expect(global1?.value).toBe(value2)

    // 0 is a value, and text that reads as a number is that number
    expect(handler.update?.(resources, { value: 0 }).success).toBe(true)
    expect(global1?.value).toBe(0)
    expect(handler.update?.(resources, { value: "3" }).success).toBe(true)
    expect(global1?.value).toBe(3)

    // unlike V2, booleans, empty text and other text are refused, and the value stays as it was
    for (const value of [false, true, "", " ", "abc", Infinity]) {
      expect(handler.update?.(resources, { value } as any))
        .toEqual({ success: false, values: { error: "global values must be numbers" } })
      expect(global1?.value).toBe(3)
    }

    // values are required
    expect(handler.update?.(resources))
      .toEqual({ success: false, values: { error: "A values object is required for this request." } })
  })

  it("create with no values makes a global value with the default name and value, as in V2", () => {
    const result = handler.create?.({})
    expect(result?.success).toBe(true)
    const { name, value } = result?.values as DIGlobal
    expect(name).toMatch(/^v\d+$/)
    expect(value).toBe(0.5)
  })

  it("update notifies plugins with global[<name>], as v2's model observer did", async () => {
    const name = "notified"
    expect((await processAction({ action: "create", resource: "global", values: { name, value: 1 } })).success)
      .toBe(true)
    const broadcastSpy = jest.spyOn(appState.document.content!, "broadcastMessage")
    expect((await processAction({ action: "update", resource: `global[${name}]`, values: { value: 7 } })).success)
      .toBe(true)
    const globalNotices = broadcastSpy.mock.calls.map(([message]) => message)
      .filter(message => message.resource === `global[${name}]`)
    expect(globalNotices).toEqual([{ action: "notify", resource: `global[${name}]`, values: { globalValue: 7 } }])
    broadcastSpy.mockRestore()
  })
})
