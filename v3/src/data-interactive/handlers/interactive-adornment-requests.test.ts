import { getSnapshot } from "mobx-state-tree"
import "../../components/graph/graph-registration"
import { appState } from "../../models/app-state"
import { setupTestDataset } from "../../test/dataset-test-utils"
import { processAction } from "../data-interactive-request-processor"

describe("create and update on the interactive adornments", () => {
  const { document } = appState
  let dotPlot: string
  let scatterPlot: string
  let createGraph: (values: any) => Promise<string>

  const request = (action: string, resource: string, values?: any) =>
    processAction({ action, resource, values } as any) as Promise<any>
  const getAdornment = async (graph: string, type: string) =>
    (await request("get", `${graph}.adornment[${type}]`)).values

  beforeAll(async () => {
    const source = setupTestDataset().dataset
    source.prepareSnapshot()
    const dataset = document.content!.createDataSet(getSnapshot(source)).sharedDataSet.dataSet
    createGraph = async (values: any) => {
      const result = await request("create", "component", { type: "graph", dataContext: dataset.name, ...values })
      return `component[${result.values.id}]`
    }
    dotPlot = await createGraph({ xAttributeName: "a3" })
    scatterPlot = await createGraph({ xAttributeName: "a3", yAttributeName: "a4" })
  })

  it.each(["Movable Line", "Movable Point", "Plotted Function"])(
    "%s: create on a plot that can't show it fails", async type => {
    expect(await request("create", `${dotPlot}.adornment`, { type })).toEqual({
      success: false, values: { error: "Adornment not supported by plot type." }
    })
  })

  it("Movable Line: create shows the inspector's starting line, and create and update set it", async () => {
    const created = await request("create", `${scatterPlot}.adornment`, { type: "Movable Line" })
    expect(created.success).toBe(true)
    expect(created.values).toEqual(await getAdornment(scatterPlot, "Movable Line"))
    const [{ slope, intercept }] = created.values.data
    expect(Number.isFinite(slope) && Number.isFinite(intercept)).toBe(true)

    expect((await request("update", `${scatterPlot}.adornment`, { type: "Movable Line", slope: 2 })).success)
      .toBe(true)
    expect((await getAdornment(scatterPlot, "Movable Line")).data).toEqual([{ slope: 2, intercept }])
    await request("create", `${scatterPlot}.adornment`, { type: "MovableLine", slope: -1, intercept: 3 })
    expect((await getAdornment(scatterPlot, "Movable Line")).data).toEqual([{ slope: -1, intercept: 3 }])
    await request("update", `${scatterPlot}.adornment`, { type: "Movable Line", intercept: 7, slope: null })
    expect((await getAdornment(scatterPlot, "Movable Line")).data).toEqual([{ slope: -1, intercept: 7 }])
  })

  it("Movable Line: setting the slope keeps where the equation is shown", async () => {
    const graphContent: any = document.content!.getTile(scatterPlot.slice(10, -1))?.content
    await request("create", `${scatterPlot}.adornment`, { type: "Movable Line" })
    const adornment = graphContent.adornmentsStore.findAdornmentOfType("Movable Line")
    const [key] = Array.from(adornment.lines.keys())
    const { slope, intercept } = adornment.lines.get(key)
    adornment.setLine({ slope, intercept, equationCoords: { x: 10, y: 20 } }, key)
    await request("update", `${scatterPlot}.adornment`, { type: "Movable Line", slope: 3 })
    expect(adornment.lines.get(key)).toMatchObject({ slope: 3, equationCoords: { x: 10, y: 20 } })
  })

  it("Movable Line: a locked intercept stays at 0", async () => {
    const graphContent: any = document.content!.getTile(scatterPlot.slice(10, -1))?.content
    await request("create", `${scatterPlot}.adornment`, { type: "Movable Line" })
    graphContent.adornmentsStore.toggleInterceptLocked()
    try {
      await request("update", `${scatterPlot}.adornment`, { type: "Movable Line", slope: 4, intercept: 5 })
      expect((await getAdornment(scatterPlot, "Movable Line")).data).toEqual([{ slope: 4, intercept: 0 }])
    } finally {
      graphContent.adornmentsStore.toggleInterceptLocked()
    }
  })

  it("Movable Point: create shows the inspector's starting point, and create and update set it", async () => {
    const created = await request("create", `${scatterPlot}.adornment`, { type: "Movable Point" })
    expect(created.success).toBe(true)
    expect(created.values).toEqual(await getAdornment(scatterPlot, "Movable Point"))
    const [{ a3: x, a4: y }] = created.values.data
    expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true)

    await request("update", `${scatterPlot}.adornment`, { type: "Movable Point", y: -2 })
    expect((await getAdornment(scatterPlot, "Movable Point")).data).toEqual([{ a3: x, a4: -2 }])
    await request("update", `${scatterPlot}.adornment`, { type: "Movable Point", x: 1.5 })
    expect((await getAdornment(scatterPlot, "Movable Point")).data).toEqual([{ a3: 1.5, a4: -2 }])
    await request("create", `${scatterPlot}.adornment`, { type: "Movable Point", x: 2.5, y: -3 })
    expect((await getAdornment(scatterPlot, "Movable Point")).data).toEqual([{ a3: 2.5, a4: -3 }])
  })

  it("Movable Line and Movable Point: a value applies to every cell of a split graph", async () => {
    const splitPlot = await createGraph({ xAttributeName: "a3", yAttributeName: "a4", topSplitAttributeName: "a1" })
    await request("create", `${splitPlot}.adornment`, { type: "Movable Line", slope: 2, intercept: 1 })
    const lines = (await getAdornment(splitPlot, "Movable Line")).data
    expect(lines).toHaveLength(2)
    lines.forEach((line: any) => expect(line).toMatchObject({ slope: 2, intercept: 1 }))

    await request("create", `${splitPlot}.adornment`, { type: "Movable Point", x: 3, y: -4 })
    const points = (await getAdornment(splitPlot, "Movable Point")).data
    expect(points).toHaveLength(2)
    points.forEach((point: any) => expect(point).toMatchObject({ a3: 3, a4: -4 }))
  })

  it("Plotted Function: create and update set the formula, as `formula` or `expression`", async () => {
    const created = await request("create", `${scatterPlot}.adornment`, { type: "Plotted Function", formula: "2 * x" })
    expect(created.values).toMatchObject({ isVisible: true, formula: JSON.stringify("2 * x") })
    expect(created.values).toEqual(await getAdornment(scatterPlot, "Plotted Function"))
    await request("update", `${scatterPlot}.adornment`, { type: "Plotted Function", expression: "x + 1" })
    expect((await getAdornment(scatterPlot, "Plotted Function")).formula).toBe(JSON.stringify("x + 1"))
  })

  it("Plotted Value: create replies as get does, and update sets the formula", async () => {
    const created = await request("create", `${dotPlot}.adornment`, { type: "Plotted Value", expression: "1" })
    expect(created.values).toMatchObject({ isVisible: true, formula: JSON.stringify("1") })
    expect(created.values).toEqual(await getAdornment(dotPlot, "Plotted Value"))
    await request("update", `${dotPlot}.adornment`, { type: "Plotted Value", formula: "mean(a3)" })
    // the formula is computed after the request
    await new Promise(resolve => setTimeout(resolve, 0))
    const plottedValue = await getAdornment(dotPlot, "Plotted Value")
    expect(plottedValue.formula).toBe(JSON.stringify("mean(a3)"))
    expect(plottedValue.data).toEqual([{ plottedValue: 3.5 }])

    // delete hides it
    expect((await request("delete", `${dotPlot}.adornment`, { type: "Plotted Value" })).success).toBe(true)
    expect(await getAdornment(dotPlot, "Plotted Value")).toMatchObject({ isVisible: false })
  })

  it.each([
    ["Plotted Function", "x * 3"], ["Plotted Value", "3"]
  ])("%s: `formula` wins over `expression`, a null one is absent, and \"\" clears it", async (type, formula) => {
    const graph = type === "Plotted Value" ? dotPlot : scatterPlot
    const formulaOf = async () => (await getAdornment(graph, type)).formula
    await request("create", `${graph}.adornment`, { type, formula, expression: "1" })
    expect(await formulaOf()).toBe(JSON.stringify(formula))
    await request("update", `${graph}.adornment`, { type, formula: null, expression: "2" })
    expect(await formulaOf()).toBe(JSON.stringify("2"))
    await request("update", `${graph}.adornment`, { type, formula: "" })
    expect(await formulaOf()).toBe(JSON.stringify(""))
  })

  it.each([
    ["Movable Line", { slope: "two" }, "slope must be a number."],
    ["Movable Line", { intercept: Infinity }, "intercept must be a number."],
    ["Movable Point", { x: 1, y: "high" }, "y must be a number."],
    ["Plotted Function", { formula: 2 }, "formula must be a string."],
    ["Plotted Value", { expression: ["x"] }, "expression must be a string."]
  ])("%s: a value of the wrong type is an error, and changes nothing", async (type, values, error) => {
    const graph = type === "Plotted Value" ? dotPlot : scatterPlot
    await request("create", `${graph}.adornment`, { type })
    const before = await getAdornment(graph, type)
    for (const action of ["create", "update"]) {
      expect(await request(action, `${graph}.adornment`, { type, ...values })).toEqual({
        success: false, values: { error }
      })
    }
    expect(await getAdornment(graph, type)).toEqual(before)
  })

  it.each([
    ["Movable Line", { slope: "two" }, "slope must be a number."],
    ["Movable Point", { x: "1" }, "x must be a number."],
    ["Plotted Function", { formula: 2 }, "formula must be a string."],
    ["Movable Line", { isVisible: "no" }, "isVisible must be true or false."],
    ["Movable Point", { isVisible: 0 }, "isVisible must be true or false."],
    ["Plotted Function", { isVisible: "true" }, "isVisible must be true or false."]
  ])("%s: a refused create on a graph without the adornment adds nothing", async (type, values, error) => {
    const graph = await createGraph({ xAttributeName: "a3", yAttributeName: "a4" })
    expect(await request("create", `${graph}.adornment`, { type, ...values })).toEqual({
      success: false, values: { error }
    })
    expect((await request("get", `${graph}.adornmentList`)).values).toEqual([])
  })
})
