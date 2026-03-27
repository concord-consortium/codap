import { diTourElementsHandler } from "./tour-elements-handler"

describe("DataInteractive TourElementsHandler", () => {
  it("get returns all tour elements as flat dotted keys", () => {
    const result = diTourElementsHandler.get!({})
    expect(result.success).toBe(true)

    const values = result.values as Record<string, { selector: string, title: string, description: string }>
    // Spot-check known keys
    expect(values["toolShelf.graph"]).toBeDefined()
    expect(values["toolShelf.graph"].selector).toBe('[data-testid="tool-shelf-button-graph"]')
    expect(values["toolShelf.graph"].title).toBe("Graph")
    expect(typeof values["toolShelf.graph"].description).toBe("string")

    expect(values["menuBar.container"]).toBeDefined()
    expect(values["menuBar.container"].selector).toBe('[data-testid="codap-menu-bar"]')

    expect(values["workspace.container"]).toBeDefined()
  })

  it("returns all namespaces flattened", () => {
    const result = diTourElementsHandler.get!({})
    const values = result.values as Record<string, unknown>
    const keys = Object.keys(values)

    // Should have keys from menuBar, toolShelf, and workspace namespaces
    expect(keys.some(k => k.startsWith("menuBar."))).toBe(true)
    expect(keys.some(k => k.startsWith("toolShelf."))).toBe(true)
    expect(keys.some(k => k.startsWith("workspace."))).toBe(true)
  })

  it("returns consistent results on repeated calls (caching)", () => {
    const result1 = diTourElementsHandler.get!({})
    const result2 = diTourElementsHandler.get!({})
    expect(result1.values).toBe(result2.values) // same object reference
  })
})
