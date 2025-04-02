import { DocumentContentModel } from "../../../models/document/document-content"
import { FreeTileRow } from "../../../models/document/free-tile-row"
import { SharedModelDocumentManager } from "../../../models/document/shared-model-document-manager"
import { CodapV2DataSetImporter, getCaseDataFromV2ContextGuid } from "../../../v2/codap-v2-data-set-importer"
import { CodapV2Document } from "../../../v2/codap-v2-document"
import { ICodapV2DocumentJson, ICodapV2GraphStorage } from "../../../v2/codap-v2-types"
import { v2AdornmentImporter } from "./v2-adornment-importer"
import { ICountAdornmentModel } from "./count/count-adornment-model"
import { IMeanAdornmentModelSnapshot } from "./univariate-measures/mean/mean-adornment-model"
import { IMedianAdornmentModelSnapshot } from "./univariate-measures/median/median-adornment-model"
import { IStandardDeviationAdornmentModelSnapshot }
  from "./univariate-measures/standard-deviation/standard-deviation-adornment-model"
import { IMeanAbsoluteDeviationAdornmentModelSnapshot }
  from "./univariate-measures/mean-absolute-deviation/mean-absolute-deviation-adornment-model"
import { IBoxPlotAdornmentModelSnapshot } from "./univariate-measures/box-plot/box-plot-adornment-model"
import { IPlottedValueAdornmentModelSnapshot } from "./univariate-measures/plotted-value/plotted-value-adornment-model"
import { IMovableValueAdornmentModelSnapshot } from "./movable-value/movable-value-adornment-model"
import { IMovablePointAdornmentModelSnapshot } from "./movable-point/movable-point-adornment-model"
import { ILSRLAdornmentModelSnapshot } from "./lsrl/lsrl-adornment-model"
import { IPlottedFunctionAdornmentModelSnapshot } from "./plotted-function/plotted-function-adornment-model"

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

  const sharedModelManager = new SharedModelDocumentManager()
  const docContent = DocumentContentModel.create({}, { sharedModelManager })
  docContent.setRowCreator(() => FreeTileRow.create())
  sharedModelManager.setDocument(docContent)

  const importer = new CodapV2DataSetImporter(v2Document.guidMap)
  v2Document.dataContexts.forEach((context) => {
    importer.importContext(context, sharedModelManager)
  })

  it("imports graphs with no adornments", () => {
    const { _links_: links, plotModels } = emptyGraph?.componentStorage as ICodapV2GraphStorage
    const contextId = links.context?.id
    const { data } = getCaseDataFromV2ContextGuid(contextId)
    const adornmentStore = v2AdornmentImporter({
      data, plotModels, attributeDescriptions: {}, yAttributeDescriptions: []
    })
    expect(adornmentStore).toBeDefined()
    expect(adornmentStore.adornments.length).toBe(1)
    const countAdornment = adornmentStore.adornments.find(a => a.type === "Count") as ICountAdornmentModel
    expect(countAdornment).toBeDefined()
    expect(countAdornment.isVisible).toBe(false)
    expect(countAdornment.showCount).toBe(false)
    expect(countAdornment.showPercent).toBe(false)
  })

  it("imports graphs with Count/Percent adornments", () => {
    const { _links_: links, plotModels } = countGraph?.componentStorage as ICodapV2GraphStorage
    const contextId = links.context?.id
    const { data } = getCaseDataFromV2ContextGuid(contextId)
    const adornmentStore = v2AdornmentImporter({
      data, plotModels, attributeDescriptions: {}, yAttributeDescriptions: []
    })
    expect(adornmentStore).toBeDefined()
    expect(adornmentStore.adornments.length).toBe(2)
    const countAdornment = adornmentStore.adornments.find(a => a.type === "Count") as ICountAdornmentModel
    expect(countAdornment).toBeDefined()
    expect(countAdornment.isVisible).toBe(true)
    expect(countAdornment.showCount).toBe(true)
    expect(countAdornment.showPercent).toBe(true)
    expect(countAdornment.percentType).toBe("row")
  })

  it("imports graphs with Connecting Lines adornments", () => {
    const { _links_: links, plotModels } = connectingLinesGraph?.componentStorage as ICodapV2GraphStorage
    const contextId = links.context?.id
    const { data } = getCaseDataFromV2ContextGuid(contextId)
    const adornmentStore = v2AdornmentImporter({
      data, plotModels, attributeDescriptions: {}, yAttributeDescriptions: []
    })
    expect(adornmentStore).toBeDefined()
    expect(adornmentStore.showConnectingLines).toBe(true)
  })

  it("imports graphs with Univariate Measure adornments", () => {
    const { _links_: links, plotModels } = univariateMeasureGraph?.componentStorage as ICodapV2GraphStorage
    const contextId = links.context?.id
    const { data } = getCaseDataFromV2ContextGuid(contextId)
    const adornmentStore = v2AdornmentImporter({
      data, plotModels, attributeDescriptions: {}, yAttributeDescriptions: []
    })
    expect(adornmentStore).toBeDefined()
    expect(adornmentStore.showMeasureLabels).toBe(true)
    expect(adornmentStore.adornments.length).toBe(9)
    const meanAdornment = adornmentStore.adornments.find(a=> a.type === "Mean") as IMeanAdornmentModelSnapshot
    expect(meanAdornment).toBeDefined()
    expect(meanAdornment.isVisible).toBe(true)
    const medianAdornment = adornmentStore.adornments.find(a => a.type === "Median") as IMedianAdornmentModelSnapshot
    expect(medianAdornment).toBeDefined()
    expect(medianAdornment.isVisible).toBe(true)
    const stDevAdornment =
      adornmentStore.adornments.find(a => a.type === "Standard Deviation") as IStandardDeviationAdornmentModelSnapshot
    expect(stDevAdornment).toBeDefined()
    expect(stDevAdornment.isVisible).toBe(true)
    const madAdornment = adornmentStore.adornments
      .find(a => a.type === "Mean Absolute Deviation") as IMeanAbsoluteDeviationAdornmentModelSnapshot
    expect(madAdornment).toBeDefined()
    expect(madAdornment?.isVisible).toBe(true)
    const boxPlotAdornment = adornmentStore.adornments
      .find(a => a.type === "Box Plot") as IBoxPlotAdornmentModelSnapshot
    expect(boxPlotAdornment).toBeDefined()
    expect(boxPlotAdornment.isVisible).toBe(true)
    expect(boxPlotAdornment.showOutliers).toBe(true)
  })

  it("imports graphs with Plotted and Movable Values adornments", () => {
    const { _links_: links, plotModels } = plottedAndMovableValuesGraph?.componentStorage as ICodapV2GraphStorage
    const contextId = links.context?.id
    const { data } = getCaseDataFromV2ContextGuid(contextId)
    const adornmentStore = v2AdornmentImporter({
      data, plotModels, attributeDescriptions: {}, yAttributeDescriptions: []
    })
    expect(adornmentStore).toBeDefined()
    expect(adornmentStore.adornments.length).toBe(3)
    const plottedValuesAdornment =
      adornmentStore.adornments.find(a => a.type === "Plotted Value") as IPlottedValueAdornmentModelSnapshot
    expect(plottedValuesAdornment).toBeDefined()
    expect(plottedValuesAdornment.isVisible).toBe(true)
    expect(plottedValuesAdornment.formula?.display).toBe("60")
    const movableValuesAdornment =
      adornmentStore.adornments.find(a => a.type === "Movable Value") as IMovableValueAdornmentModelSnapshot
    expect(movableValuesAdornment).toBeDefined()
    expect(movableValuesAdornment.isVisible).toBe(true)
  })

  it("imports graphs with Movable Point, Line, LSRL adornments", () => {
    const { _links_: links, plotModels } = movablePointLineLSRLGraph?.componentStorage as ICodapV2GraphStorage
    const contextId = links.context?.id
    const { data } = getCaseDataFromV2ContextGuid(contextId)
    const adornmentStore = v2AdornmentImporter({
      data, plotModels, attributeDescriptions: {}, yAttributeDescriptions: []
    })
    expect(adornmentStore).toBeDefined()
    expect(adornmentStore.interceptLocked).toBe(true)
    expect(adornmentStore.adornments.length).toBe(4)
    const movablePointAdornment =
      adornmentStore.adornments.find(a => a.type === "Movable Point") as IMovablePointAdornmentModelSnapshot
    expect(movablePointAdornment).toBeDefined()
    expect(movablePointAdornment.isVisible).toBe(true)
    const movableLineAdornment =
      adornmentStore.adornments.find(a => a.type === "Movable Line") as IMovablePointAdornmentModelSnapshot
    expect(movableLineAdornment).toBeDefined()
    expect(movableLineAdornment.isVisible).toBe(true)
    const lsrlAdornment = adornmentStore.adornments.find(a => a.type === "LSRL") as ILSRLAdornmentModelSnapshot
    expect(lsrlAdornment).toBeDefined()
    expect(lsrlAdornment.isVisible).toBe(true)
  })

  it("imports graphs with Plotted Function adornments", () => {
    const { _links_: links, plotModels } = plottedFunctionGraph?.componentStorage as ICodapV2GraphStorage
    const contextId = links.context?.id
    const { data } = getCaseDataFromV2ContextGuid(contextId)
    const adornmentStore = v2AdornmentImporter({
      data, plotModels, attributeDescriptions: {}, yAttributeDescriptions: []
    })
    expect(adornmentStore).toBeDefined()
    expect(adornmentStore.adornments.length).toBe(2)
    const plottedFunctionAdornment =
      adornmentStore.adornments.find(a => a.type === "Plotted Function") as IPlottedFunctionAdornmentModelSnapshot
    expect(plottedFunctionAdornment).toBeDefined()
    expect(plottedFunctionAdornment.isVisible).toBe(true)
    expect(plottedFunctionAdornment.formula?.display).toBe("x*x")
  })
})
