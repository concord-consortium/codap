import { GlobalValue } from "./global-value"
import { GlobalValueManager } from "./global-value-manager"

describe("GlobalValueManager", () => {
  it("works as expected", () => {
    const m = GlobalValueManager.create()
    expect(m.globals.size).toBe(0)
    const v = GlobalValue.create({ name: m.uniqueName(), value: 1 })
    expect(v.name).toBe("v1")
    expect(v.value).toBe(1)
    m.addValue(v)
    expect(m.globals.size).toBe(1)
    expect(m.getValueById("foo")).toBeUndefined()
    expect(m.getValueById(v.id)).toBe(v)
    expect(m.getValueByName("foo")).toBeUndefined()
    expect(m.getValueByName("v1")).toBe(v)
    v.setName(m.uniqueName())
    expect(v.name).toBe("v2")
    expect(m.getValueByName("v1")).toBeUndefined()
    expect(m.getValueByName("v2")).toBe(v)
    v.setValue(2)
    expect(v.value).toBe(2)

    const v2 = GlobalValue.create({ name: "v2", value: 0 })
    jestSpyConsole("warn", spy => {
      m.addValue(v2)
      expect(spy).toHaveBeenCalledTimes(1)
    })
    expect(m.globals.size).toBe(2)

    m.removeValue(v)
    expect(m.globals.size).toBe(1)
    expect(m.getValueByName("v2")).toBe(v2)
  })
})
