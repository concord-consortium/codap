import { GlobalValue } from "../../models/global/global-value"
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

    // 0 is a value, and false and "" are stored as 0, as on create
    expect(handler.update?.(resources, { value: 0 }).success).toBe(true)
    expect(global1?.value).toBe(0)
    for (const value of [false, ""]) {
      expect(handler.update?.(resources, { value: value2 }).success).toBe(true)
      expect(handler.update?.(resources, { value } as any).success).toBe(true)
      expect(global1?.value).toBe(0)
    }
  })
})
