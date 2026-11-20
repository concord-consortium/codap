import { getSnapshot } from "mobx-state-tree"
import "../../components/graph/graph-registration"
import { appState } from "../../models/app-state"
import { IDataSet } from "../../models/data/data-set"
import { setupTestDataset } from "../../test/dataset-test-utils"
import { processAction } from "../data-interactive-request-processor"

describe("create and update on the univariate adornments", () => {
  const { document } = appState
  let testData: IDataSet
  let dotPlot: string
  let scatterPlot: string

  const request = (action: string, resource: string, values?: any) =>
    processAction({ action, resource, values } as any) as Promise<any>
  const getAdornment = async (graph: string, type: string) =>
    (await request("get", `${graph}.adornment[${type}]`)).values

  const createDataSet = () => {
    const source = setupTestDataset().dataset
    source.prepareSnapshot()
    return document.content!.createDataSet(getSnapshot(source)).sharedDataSet.dataSet
  }
  const createGraph = async (dataset: IDataSet, values: any) => {
    const result = await request("create", "component", { type: "graph", dataContext: dataset.name, ...values })
    return `component[${result.values.id}]`
  }

  beforeAll(async () => {
    testData = createDataSet()
    dotPlot = await createGraph(testData, { xAttributeName: "a3" })
    scatterPlot = await createGraph(testData, { xAttributeName: "a3", yAttributeName: "a4" })
  })

  // a3 is 1 through 6: mean 3.5, mean absolute deviation 1.5
  it.each([
    ["Box Plot", { median: 3.5, lower: 1, upper: 6 }],
    ["Mean Absolute Deviation", { mean: 3.5, min: 2, max: 5 }],
    ["Normal Curve", { mean: 3.5 }],
    ["Standard Error", { min: expect.any(Number), max: expect.any(Number) }]
  ])("%s: create shows it, replying as get does, and update shows or hides it", async (type, data) => {
    const created = await request("create", `${dotPlot}.adornment`, { type })
    expect(created.success).toBe(true)
    expect(created.values).toMatchObject({ type, isVisible: true })
    expect(created.values.data[0]).toMatchObject(data)
    expect(Object.values(created.values.data[0]).every(value => Number.isFinite(value))).toBe(true)
    expect(created.values).toEqual(await getAdornment(dotPlot, type))

    expect((await request("update", `${dotPlot}.adornment`, { type, isVisible: false })).success).toBe(true)
    expect((await getAdornment(dotPlot, type)).isVisible).toBe(false)
    // creating it again shows the same adornment
    expect((await request("create", `${dotPlot}.adornment`, { type })).values.id).toBe(created.values.id)
    expect((await getAdornment(dotPlot, type)).isVisible).toBe(true)
  })

  it.each(["Box Plot", "Mean Absolute Deviation", "Normal Curve", "Standard Error"])(
    "%s: create on a plot that can't show it fails", async type => {
    expect(await request("create", `${scatterPlot}.adornment`, { type })).toEqual({
      success: false, values: { error: "Adornment not supported by plot type." }
    })
  })

  it("Box Plot: create and update set showOutliers and showICI", async () => {
    const graph = await createGraph(testData, { xAttributeName: "a3" })
    await request("create", `${graph}.adornment`, { type: "Box Plot", showOutliers: true })
    expect(await getAdornment(graph, "Box Plot")).toMatchObject({ showOutliers: true, showICI: false })

    await request("update", `${graph}.adornment`, { type: "Box Plot", showOutliers: false, showICI: true })
    expect(await getAdornment(graph, "Box Plot")).toMatchObject({ showOutliers: false, showICI: true })
  })

  it("Box Plot: showOutliers moves the whisker, even while the box plot is hidden", async () => {
    // a3 is 100, 2, 3, 4, 5, 6: with outliers shown, the upper whisker ends at 6
    const dataset = createDataSet()
    dataset.setCaseValues([{ __id__: dataset.items[0].__id__, [dataset.attrFromName("a3")!.id]: 100 }])
    const graph = await createGraph(dataset, { xAttributeName: "a3" })
    const upper = async () => (await getAdornment(graph, "Box Plot")).data[0].upper

    await request("create", `${graph}.adornment`, { type: "Box Plot" })
    expect(await upper()).toBe(100)
    await request("update", `${graph}.adornment`, { type: "Box Plot", isVisible: false })
    await request("update", `${graph}.adornment`, { type: "Box Plot", showOutliers: true })
    expect(await upper()).toBe(6)
    await request("update", `${graph}.adornment`, { type: "Box Plot", showOutliers: false })
    expect(await upper()).toBe(100)
    expect((await getAdornment(graph, "Box Plot")).isVisible).toBe(false)
  })

  it("Standard Error: create and update set the number of standard errors", async () => {
    const graph = await createGraph(testData, { xAttributeName: "a3" })
    // by the type's space-free alias
    const created = await request("create", `${graph}.adornment`, { type: "StandardError", _numStErrs: 2 })
    expect(created.values._numStErrs).toBe(2)
    // the interval is the mean plus or minus that many standard errors
    const [{ standardError, min, max }] = created.values.data
    expect(max - min).toBeCloseTo(4 * standardError)

    await request("update", `${graph}.adornment`, { type: "Standard Error", _numStErrs: 1.5 })
    const updated = await getAdornment(graph, "Standard Error")
    expect(updated._numStErrs).toBe(1.5)
    expect(updated.isVisible).toBe(true)
    expect(updated.data[0].max - updated.data[0].min).toBeCloseTo(3 * standardError)
    // one that isn't a finite number is refused, and changes nothing
    const other = await createGraph(testData, { xAttributeName: "a3" })
    expect(await request("create", `${other}.adornment`, { type: "Standard Error", _numStErrs: "x" }))
      .toEqual({ success: false, values: { error: "_numStErrs must be a number." } })
    expect((await request("get", `${other}.adornmentList`)).values).toEqual([])
    for (const _numStErrs of ["three", "2", NaN, Infinity]) {
      expect(await request("update", `${graph}.adornment`, { type: "Standard Error", _numStErrs, isVisible: false }))
        .toEqual({ success: false, values: { error: "_numStErrs must be a number." } })
    }
    expect(await getAdornment(graph, "Standard Error")).toMatchObject({ _numStErrs: 1.5, isVisible: true })
    // as in v2, a negative value is ignored; null is treated as absent
    for (const _numStErrs of [null, -2]) {
      expect((await request("update", `${graph}.adornment`, { type: "Standard Error", _numStErrs })).success).toBe(true)
    }
    expect((await getAdornment(graph, "Standard Error"))._numStErrs).toBe(1.5)
  })

  it("Count, LSRL and Region of Interest: create and update refuse values of the wrong type", async () => {
    const refusal = (error: string) => ({ success: false, values: { error } })
    const dot = await createGraph(testData, { xAttributeName: "a3" })
    // checked for Count and Percent alike, before anything changes
    expect(await request("create", `${dot}.adornment`, { type: "Count", percentType: "rows" }))
      .toEqual(refusal("percentType must be one of cell, column, row."))
    expect((await request("get", `${dot}.adornmentList`)).values).toEqual([])
    expect((await request("create", `${dot}.adornment`, { type: "Count", percentType: "cell" })).success).toBe(true)
    expect(await request("update", `${dot}.adornment`, { type: "Count", percentType: "Row", isVisible: false }))
      .toEqual(refusal("percentType must be one of cell, column, row."))
    expect(await getAdornment(dot, "Count")).toMatchObject({ isVisible: true })

    expect(await request("create", `${dot}.adornment`, { type: "Region of Interest", primary: 5 }))
      .toEqual(refusal("primary must be an object."))
    expect(await request("create", `${dot}.adornment`, { type: "Region of Interest", primary: { position: true } }))
      .toEqual(refusal("primary.position must be a number or a string."))
    expect(await request("create", `${dot}.adornment`, { type: "Region of Interest", secondary: { extent: [1] } }))
      .toEqual(refusal("secondary.extent must be a number or a string."))
    expect(await request("create", `${dot}.adornment`, { type: "Region of Interest", secondary: [] }))
      .toEqual(refusal("secondary must be an object."))
    expect(await request("create", `${dot}.adornment`,
      { type: "Region of Interest", secondary: { axis: "x" } })).toEqual(refusal("secondary.axis must be one of y."))
    expect((await request("get", `${dot}.adornmentList`)).values.map(({ type }: any) => type))
      .not.toContain("Region of Interest")
    expect((await request("create", `${dot}.adornment`,
      { type: "Region of Interest", primary: { position: 2, extent: "50%" } })).success).toBe(true)

    // a null range is treated as absent
    expect((await request("create", `${dot}.adornment`,
      { type: "Region of Interest", primary: null })).success).toBe(true)

    const scatter = await createGraph(testData, { xAttributeName: "a3", yAttributeName: "a4" })
    expect(await request("create", `${scatter}.adornment`, { type: "LSRL", showRSquared: 1 }))
      .toEqual(refusal("showRSquared must be true or false."))
    expect((await request("get", `${scatter}.adornmentList`)).values).toEqual([])
    expect((await request("create", `${scatter}.adornment`, { type: "LSRL" })).success).toBe(true)
    expect(await request("update", `${scatter}.adornment`, { type: "LSRL", showR: "yes", isVisible: false }))
      .toEqual(refusal("showR must be true or false."))
    expect(await getAdornment(scatter, "LSRL")).toMatchObject({ isVisible: true })
  })

  const isVisibleError = { success: false, values: { error: "isVisible must be true or false." } }

  it.each([
    ["Mean", "dot"], ["Median", "dot"], ["Standard Deviation", "dot"], ["Box Plot", "dot"],
    ["Mean Absolute Deviation", "dot"], ["Normal Curve", "dot"], ["Standard Error", "dot"], ["Count", "dot"],
    ["Movable Value", "dot"], ["Plotted Value", "dot"], ["Region of Interest", "dot"], ["LSRL", "scatter"]
  ])("%s: create and update refuse an isVisible that isn't a boolean", async (type, plot) => {
    const graph = await createGraph(testData,
      plot === "dot" ? { xAttributeName: "a3" } : { xAttributeName: "a3", yAttributeName: "a4" })
    expect(await request("create", `${graph}.adornment`, { type, isVisible: "true" })).toEqual(isVisibleError)
    expect((await request("get", `${graph}.adornmentList`)).values).toEqual([])

    expect((await request("create", `${graph}.adornment`, { type, isVisible: null })).success).toBe(true)
    for (const isVisible of ["no", 0, 1, "false"]) {
      expect(await request("update", `${graph}.adornment`, { type, isVisible })).toEqual(isVisibleError)
    }
    expect((await getAdornment(graph, type)).isVisible).toBe(true)
  })

  it("Box Plot: create and update refuse a showOutliers or showICI that isn't a boolean", async () => {
    const graph = await createGraph(testData, { xAttributeName: "a3" })
    expect(await request("create", `${graph}.adornment`, { type: "Box Plot", showOutliers: "yes" })).toEqual({
      success: false, values: { error: "showOutliers must be true or false." }
    })
    expect((await request("get", `${graph}.adornmentList`)).values).toEqual([])

    await request("create", `${graph}.adornment`, { type: "Box Plot" })
    expect(await request("update", `${graph}.adornment`, { type: "Box Plot", isVisible: false, showICI: 1 }))
      .toEqual({ success: false, values: { error: "showICI must be true or false." } })
    expect(await getAdornment(graph, "Box Plot")).toMatchObject({ isVisible: true, showICI: false })
  })
})
