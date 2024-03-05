import { CodapV2Document } from "../../../v2/codap-v2-document"
import { ICodapV2DocumentJson, ICodapV2GraphStorage } from "../../../v2/codap-v2-types"
import { v2AdornmentImporter } from "./v2-adornment-importer"
import { ICountAdornmentModel } from "./count/count-adornment-model"
import { IMeanAdornmentModel } from "./univariate-measures/mean/mean-adornment-model"
import { IMedianAdornmentModel } from "./univariate-measures/median/median-adornment-model"
import { IStandardDeviationAdornmentModel }
  from "./univariate-measures/standard-deviation/standard-deviation-adornment-model"
import { IMeanAbsoluteDeviationAdornmentModel }
  from "./univariate-measures/mean-absolute-deviation/mean-absolute-deviation-adornment-model"
import { IBoxPlotAdornmentModel } from "./univariate-measures/box-plot/box-plot-adornment-model"
import { IPlottedValueAdornmentModel } from "./univariate-measures/plotted-value/plotted-value-adornment-model"
import { IMovableValueAdornmentModel } from "./movable-value/movable-value-adornment-model"
import { IMovablePointAdornmentModel } from "./movable-point/movable-point-adornment-model"
import { IMovableLineAdornmentModel } from "./movable-line/movable-line-adornment-model"
import { ILSRLAdornmentModel } from "./lsrl/lsrl-adornment-model"
import { IPlottedFunctionAdornmentModel } from "./plotted-function/plotted-function-adornment-model"

const fs = require("fs")
const path = require("path")

describe("V2AdornmentImporter", () => {
  const file = path.join(__dirname, "../../../test/v2", "mammals-adornments.codap")
  const mammalsJson = fs.readFileSync(file, "utf8")
  const mammalsDoc = JSON.parse(mammalsJson) as ICodapV2DocumentJson
  const v2Document = new CodapV2Document(mammalsDoc)
  const graphs = v2Document.components.filter(c => c.type === "DG.GraphView")
  const emptyGraph = graphs.find(g => g.componentStorage?.title === "Empty")
  const countGraph = graphs.find(g => g.componentStorage?.title === "Count/Percent")
  const connectingLinesGraph = graphs.find(g => g.componentStorage?.title === "Connecting Lines")
  const univariateMeasureGraph = graphs.find(g => g.componentStorage?.title === "Univariate Measures")
  const plottedAndMovableValuesGraph = graphs.find(g => g.componentStorage?.title === "Plotted and Movable Values")
  const movablePointLineLSRLGraph = graphs.find(g => g.componentStorage?.title === "Movable Point, Line, LSRL")
  const plottedFunctionGraph = graphs.find(g => g.componentStorage?.title === "Plotted Function")

  it("imports graphs with no adornments", () => {
    const { _links_: links, plotModels } = emptyGraph?.componentStorage as ICodapV2GraphStorage
    const contextId = links.context?.id
    const { data } = v2Document.getDataAndMetadata(contextId)
    const adornmentStore = v2AdornmentImporter({
      data, plotModels, attributeDescriptions: {}, yAttributeDescriptions: []
    })
    expect(adornmentStore).toBeDefined()
    expect(adornmentStore.adornments.length).toBe(1)
    const countAdornment = adornmentStore.adornments.find(a => a.type === "Count") as ICountAdornmentModel
    expect(countAdornment).toBeDefined()
    expect(countAdornment.id).toBeDefined()
    expect(countAdornment.isVisible).toBe(false)
    expect(countAdornment.showCount).toBe(false)
    expect(countAdornment.showPercent).toBe(false)
  })

  it("imports graphs with Count/Percent adornments", () => {
    const { _links_: links, plotModels } = countGraph?.componentStorage as ICodapV2GraphStorage
    const contextId = links.context?.id
    const { data } = v2Document.getDataAndMetadata(contextId)
    const adornmentStore = v2AdornmentImporter({
      data, plotModels, attributeDescriptions: {}, yAttributeDescriptions: []
    })
    expect(adornmentStore).toBeDefined()
    expect(adornmentStore.adornments.length).toBe(2)
    const countAdornment = adornmentStore.adornments.find(a => a.type === "Count") as ICountAdornmentModel
    expect(countAdornment).toBeDefined()
    expect(countAdornment.id).toBeDefined()
    expect(countAdornment.isVisible).toBe(true)
    expect(countAdornment.showCount).toBe(true)
    expect(countAdornment.showPercent).toBe(true)
    expect(countAdornment.percentType).toBe("cell")
  })

  it("imports graphs with Connecting Lines adornments", () => {
    const { _links_: links, plotModels } = connectingLinesGraph?.componentStorage as ICodapV2GraphStorage
    const contextId = links.context?.id
    const { data } = v2Document.getDataAndMetadata(contextId)
    const adornmentStore = v2AdornmentImporter({
      data, plotModels, attributeDescriptions: {}, yAttributeDescriptions: []
    })
    expect(adornmentStore).toBeDefined()
    expect(adornmentStore.showConnectingLines).toBe(true)
  })

  it("imports graphs with Univariate Measure adornments", () => {
    const { _links_: links, plotModels } = univariateMeasureGraph?.componentStorage as ICodapV2GraphStorage
    const contextId = links.context?.id
    const { data } = v2Document.getDataAndMetadata(contextId)
    const adornmentStore = v2AdornmentImporter({
      data, plotModels, attributeDescriptions: {}, yAttributeDescriptions: []
    })
    expect(adornmentStore).toBeDefined()
    expect(adornmentStore.showMeasureLabels).toBe(true)
    expect(adornmentStore.adornments.length).toBe(8)
    const meanAdornment = adornmentStore.adornments.find(a=> a.type === "Mean") as IMeanAdornmentModel
    expect(meanAdornment).toBeDefined()
    expect(meanAdornment.id).toBeDefined()
    expect(meanAdornment.isVisible).toBe(true)
    const medianAdornment = adornmentStore.adornments.find(a => a.type === "Median") as IMedianAdornmentModel
    expect(medianAdornment).toBeDefined()
    expect(medianAdornment.id).toBeDefined()
    expect(medianAdornment.isVisible).toBe(true)
    const stDevAdornment =
      adornmentStore.adornments.find(a => a.type === "Standard Deviation") as IStandardDeviationAdornmentModel
    expect(stDevAdornment).toBeDefined()
    expect(stDevAdornment.id).toBeDefined()
    expect(stDevAdornment.isVisible).toBe(true)
    const madAdornment =
      adornmentStore.adornments.find(a => a.type === "Mean Absolute Deviation") as IMeanAbsoluteDeviationAdornmentModel
    expect(madAdornment).toBeDefined()
    expect(madAdornment?.id).toBeDefined()
    expect(madAdornment?.isVisible).toBe(true)
    const boxPlotAdornment = adornmentStore.adornments.find(a => a.type === "Box Plot") as IBoxPlotAdornmentModel
    expect(boxPlotAdornment).toBeDefined()
    expect(boxPlotAdornment.id).toBeDefined()
    expect(boxPlotAdornment.isVisible).toBe(true)
    expect(boxPlotAdornment.showOutliers).toBe(true)
  })

  it("imports graphs with Plotted and Movable Values adornments", () => {
    const { _links_: links, plotModels } = plottedAndMovableValuesGraph?.componentStorage as ICodapV2GraphStorage
    const contextId = links.context?.id
    const { data } = v2Document.getDataAndMetadata(contextId)
    const adornmentStore = v2AdornmentImporter({
      data, plotModels, attributeDescriptions: {}, yAttributeDescriptions: []
    })
    expect(adornmentStore).toBeDefined()
    expect(adornmentStore.adornments.length).toBe(3)
    const plottedValuesAdornment =
      adornmentStore.adornments.find(a => a.type === "Plotted Value") as IPlottedValueAdornmentModel
    expect(plottedValuesAdornment).toBeDefined()
    expect(plottedValuesAdornment.id).toBeDefined()
    expect(plottedValuesAdornment.isVisible).toBe(true)
    expect(plottedValuesAdornment.formula.display).toBe("60")
    const movableValuesAdornment =
      adornmentStore.adornments.find(a => a.type === "Movable Value") as IMovableValueAdornmentModel
    expect(movableValuesAdornment).toBeDefined()
    expect(movableValuesAdornment.id).toBeDefined()
    expect(movableValuesAdornment.isVisible).toBe(true)
  })

  it("imports graphs with Movable Point, Line, LSRL adornments", () => {
    const { _links_: links, plotModels } = movablePointLineLSRLGraph?.componentStorage as ICodapV2GraphStorage
    const contextId = links.context?.id
    const { data } = v2Document.getDataAndMetadata(contextId)
    const adornmentStore = v2AdornmentImporter({
      data, plotModels, attributeDescriptions: {}, yAttributeDescriptions: []
    })
    expect(adornmentStore).toBeDefined()
    expect(adornmentStore.interceptLocked).toBe(true)
    expect(adornmentStore.adornments.length).toBe(4)
    const movablePointAdornment =
      adornmentStore.adornments.find(a => a.type === "Movable Point") as IMovablePointAdornmentModel
    expect(movablePointAdornment).toBeDefined()
    expect(movablePointAdornment.id).toBeDefined()
    expect(movablePointAdornment.isVisible).toBe(true)
    const movableLineAdornment =
      adornmentStore.adornments.find(a => a.type === "Movable Line") as IMovableLineAdornmentModel
    expect(movableLineAdornment).toBeDefined()
    expect(movableLineAdornment.id).toBeDefined()
    expect(movableLineAdornment.isVisible).toBe(true)
    const lsrlAdornment = adornmentStore.adornments.find(a => a.type === "LSRL") as ILSRLAdornmentModel
    expect(lsrlAdornment).toBeDefined()
    expect(lsrlAdornment.id).toBeDefined()
    expect(lsrlAdornment.isVisible).toBe(true)
  })

  it("imports graphs with Plotted Function adornments", () => {
    const { _links_: links, plotModels } = plottedFunctionGraph?.componentStorage as ICodapV2GraphStorage
    const contextId = links.context?.id
    const { data } = v2Document.getDataAndMetadata(contextId)
    const adornmentStore = v2AdornmentImporter({
      data, plotModels, attributeDescriptions: {}, yAttributeDescriptions: []
    })
    expect(adornmentStore).toBeDefined()
    expect(adornmentStore.adornments.length).toBe(2)
    const plottedFunctionAdornment =
      adornmentStore.adornments.find(a => a.type === "Plotted Function") as IPlottedFunctionAdornmentModel
    expect(plottedFunctionAdornment).toBeDefined()
    expect(plottedFunctionAdornment.id).toBeDefined()
    expect(plottedFunctionAdornment.isVisible).toBe(true)
    expect(plottedFunctionAdornment.formula.display).toBe("x*x")
  })
})
