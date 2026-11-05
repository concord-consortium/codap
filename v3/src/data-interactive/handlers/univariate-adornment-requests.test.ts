import { getSnapshot } from "mobx-state-tree"
import "../../components/graph/graph-registration"
import { appState } from "../../models/app-state"
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

  beforeAll(async () => {
    const source = setupTestDataset().dataset
    source.prepareSnapshot()
    const dataset = document.content!.createDataSet(getSnapshot(source)).sharedDataSet.dataSet
    const createGraph = async (values: any) => {
      const result = await request("create", "component", { type: "graph", dataContext: dataset.name, ...values })
      return `component[${result.values.id}]`
    }
    dotPlot = await createGraph({ xAttributeName: "a3" })
    scatterPlot = await createGraph({ xAttributeName: "a3", yAttributeName: "a4" })
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

  it("Standard Error: create and update set the number of standard errors", async () => {
    // by the type's space-free alias
    await request("create", `${dotPlot}.adornment`, { type: "StandardError", _numStErrs: 2 })
    expect((await getAdornment(dotPlot, "Standard Error"))._numStErrs).toBe(2)

    await request("update", `${dotPlot}.adornment`, { type: "Standard Error", _numStErrs: 1.5 })
    expect((await getAdornment(dotPlot, "Standard Error"))._numStErrs).toBe(1.5)
    // a negative value, or one that isn't a finite number, is ignored
    await request("update", `${dotPlot}.adornment`, { type: "Standard Error", _numStErrs: "three" })
    await request("update", `${dotPlot}.adornment`, { type: "Standard Error", _numStErrs: -2 })
    expect((await getAdornment(dotPlot, "Standard Error"))._numStErrs).toBe(1.5)
  })
})
