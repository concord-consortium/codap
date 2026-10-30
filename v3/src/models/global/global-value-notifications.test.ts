import { GlobalValue } from "./global-value"
import { GlobalValueManager } from "./global-value-manager"
import { observeGlobalValueChanges, withoutGlobalValueNotifications } from "./global-value-notifications"

describe("observeGlobalValueChanges", () => {
  function setup() {
    const manager = GlobalValueManager.create()
    const v1 = GlobalValue.create({ name: "v1", value: 1 })
    manager.addValue(v1)
    const broadcast = jest.fn()
    const disposer = observeGlobalValueChanges(() => manager, broadcast)
    const notices = () => broadcast.mock.calls.map(([message]) => message)
    return { manager, v1, broadcast, disposer, notices }
  }

  it("sends global[<name>] to plugins whenever a value changes", () => {
    const { v1, disposer, notices } = setup()
    expect(notices()).toEqual([])

    v1.setValue(2)
    expect(notices()).toEqual([{ action: "notify", resource: "global[v1]", values: { globalValue: 2 } }])

    // dynamic values (slider drags) notify too, and the final value notifies only if it differs
    v1.setDynamicValue(3)
    v1.setValue(3)
    expect(notices()).toHaveLength(2)
    expect(notices()[1].values).toEqual({ globalValue: 3 })
    disposer()
  })

  it("sends nothing when a global is added, renamed or removed, or after disposal", () => {
    const { manager, v1, disposer, notices } = setup()
    const v2 = GlobalValue.create({ name: "v2", value: 5 })
    manager.addValue(v2)
    v1.setName("renamed")
    manager.removeValue(v2)
    expect(notices()).toEqual([])

    v1.setValue(10)
    expect(notices()).toEqual([{ action: "notify", resource: "global[renamed]", values: { globalValue: 10 } }])

    disposer()
    v1.setValue(11)
    expect(notices()).toHaveLength(1)
  })

  it("sends nothing for changes made without notifications, such as a document update", () => {
    const { v1, disposer, notices } = setup()
    withoutGlobalValueNotifications(() => v1.setValue(4))
    expect(notices()).toEqual([])

    // later changes are compared with the value set without notification
    v1.setValue(4)
    expect(notices()).toEqual([])
    v1.setValue(6)
    expect(notices()).toEqual([{ action: "notify", resource: "global[v1]", values: { globalValue: 6 } }])
    disposer()
  })
})
