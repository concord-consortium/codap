import { getSnapshot } from "mobx-state-tree"
import "../../components/graph/graph-registration"
import { appState } from "../../models/app-state"
import { IDataSet } from "../../models/data/data-set"
import { setupTestDataset } from "../../test/dataset-test-utils"
import { processAction } from "../data-interactive-request-processor"

// Box Plot, Mean Absolute Deviation, Normal Curve and Standard Error can be shown and configured through
// the API, as Mean, Median and Standard Deviation already could (CODAP-1551)
describe("create and update on the univariate adornments", () => {
  const { document } = appState
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
    const dataset = createDataSet()
    dotPlot = await createGraph(dataset, { xAttributeName: "a3" })
    scatterPlot = await createGraph(dataset, { xAttributeName: "a3", yAttributeName: "a4" })
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
    expect(created.values).toEqual({ ...await getAdornment(dotPlot, type), id: created.values.id })

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
    await request("create", `${dotPlot}.adornment`, { type: "Box Plot", showOutliers: true })
    expect(await getAdornment(dotPlot, "Box Plot")).toMatchObject({ showOutliers: true, showICI: false })

    await request("update", `${dotPlot}.adornment`, { type: "Box Plot", showOutliers: false, showICI: true })
    expect(await getAdornment(dotPlot, "Box Plot")).toMatchObject({ showOutliers: false, showICI: true })
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
  })

  it("Standard Error: create and update set the number of standard errors", async () => {
    // by the type's space-free alias
    const created = await request("create", `${dotPlot}.adornment`, { type: "StandardError", _numStErrs: 2 })
    expect(created.values._numStErrs).toBe(2)
    // the interval is the mean plus or minus that many standard errors
    const [{ standardError, min, max }] = created.values.data
    expect(max - min).toBeCloseTo(4 * standardError)

    await request("update", `${dotPlot}.adornment`, { type: "Standard Error", _numStErrs: 1.5 })
    const updated = await getAdornment(dotPlot, "Standard Error")
    expect(updated._numStErrs).toBe(1.5)
    expect(updated.data[0].max - updated.data[0].min).toBeCloseTo(3 * standardError)
    // a negative value, or one that isn't a finite number, is ignored
    for (const _numStErrs of ["three", -2, NaN, Infinity]) {
      await request("update", `${dotPlot}.adornment`, { type: "Standard Error", _numStErrs })
    }
    expect((await getAdornment(dotPlot, "Standard Error"))._numStErrs).toBe(1.5)
  })
})
