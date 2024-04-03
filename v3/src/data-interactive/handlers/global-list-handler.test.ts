
import { appState } from "../../models/app-state"
import { GlobalValueManager } from "../../models/global/global-value-manager"
import { DIGlobal } from "../data-interactive-types"
import { diGlobalListHandler } from "./global-list-handler"

describe("DataInteractive GlobalListHandler", () => {
  const handler = diGlobalListHandler

  it("get works as expected", () => {
    // const global1 = globalValueManager?.addValueSnapshot({ name: name1, value: value1 })
    expect(handler.get?.({}).values).toEqual([])

    const name1 = "g1"
    const value1 = 1
    const name2 = "g2"
    const value2 = 2
    const globalValueManager = appState.document.content?.getFirstSharedModelByType(GlobalValueManager)
    globalValueManager?.addValueSnapshot({ name: name1, value: value1 })
    globalValueManager?.addValueSnapshot({ name: name2, value: value2 })
    const result = handler.get?.({})
    expect(result?.success).toBe(true)
    const values = result?.values as DIGlobal[]
    expect(values.length).toBe(2)
    const names = values.map(value => value.name)
    expect(names.includes(name1) && names.includes(name2)).toBe(true)
    const vals = values.map(value => value.value)
    expect(vals.includes(value1) && vals.includes(value2)).toBe(true)
  })
})
