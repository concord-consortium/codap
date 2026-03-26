import { getType } from "mobx-state-tree"
import { DataSet } from "../../models/data/data-set"
import { DocumentContentModel, IDocumentContentModel } from "../../models/document/document-content"
import { FreeTileRow } from "../../models/document/free-tile-row"
import { SharedModelDocumentManager } from "../../models/document/shared-model-document-manager"
import { DataSetMetadata } from "../../models/shared/data-set-metadata"
import { getSharedDataSetFromDataSetId } from "../../models/shared/shared-data-utils"
import { ISharedModel } from "../../models/shared/shared-model"
import { ITileContentModel } from "../../models/tiles/tile-content"
import { ITileModelSnapshotIn } from "../../models/tiles/tile-model"
import { safeJsonParse } from "../../utilities/js-utils"
import { CodapV2DataSetImporter, getCaseDataFromV2ContextGuid } from "../../v2/codap-v2-data-set-importer"
import { CodapV2Document } from "../../v2/codap-v2-document"
import { ICodapV2DocumentJson } from "../../v2/codap-v2-types"
import {isGraphContentModel} from "./models/graph-content-model"
import { IGraphPointLayerModel } from "./models/graph-point-layer-model"
import { isBarChartModel } from "./plots/bar-chart/bar-chart-model"
import { v2GraphImporter } from "./v2-graph-importer"
import "./graph-registration"

const fs = require("fs")
const path = require("path")

function firstGraphComponent(v2Document: CodapV2Document) {
  return v2Document.components.find(c => c.type === "DG.GraphView")!
}

function graphComponentWithTitle(v2Document: CodapV2Document, title: string) {
  return v2Document.components.find(c => c.componentStorage?.title === title)!
}

describe("V2GraphImporter", () => {
  const mammalsFile = path.join(__dirname, "../../test/v2", "mammals-graphs.codap")
  const mammalsJson = fs.readFileSync(mammalsFile, "utf8")
  const mammalsDoc = safeJsonParse<ICodapV2DocumentJson>(mammalsJson)!

  let v2Document: CodapV2Document
  let docContent: IDocumentContentModel | undefined
  let sharedModelManager: SharedModelDocumentManager | undefined
  const mockGetCaseData = jest.fn((dataContextGuid: number) => {
    return getCaseDataFromV2ContextGuid(dataContextGuid, sharedModelManager)
  })
  const mockGetGlobalValues = jest.fn()
  const mockInsertTile = jest.fn((tileSnap: ITileModelSnapshotIn) => {
    const tile = docContent!.insertTileSnapshotInDefaultRow(tileSnap)
    return tile
  })
  const mockLinkSharedModel = jest.fn(
    (tileContent: ITileContentModel, sharedModel?: ISharedModel, isProvider?: boolean) => {
      if (sharedModel) {
        sharedModelManager?.addTileSharedModel(tileContent, sharedModel, isProvider)
      }
    }
  )
  const mockImportArgs = {
    getCaseData: mockGetCaseData,
    getGlobalValues: mockGetGlobalValues,
    insertTile: mockInsertTile,
    linkSharedModel: mockLinkSharedModel
  }

  beforeEach(() => {
    v2Document = new CodapV2Document(mammalsDoc)
    sharedModelManager = new SharedModelDocumentManager()
    docContent = DocumentContentModel.create({}, { sharedModelManager })
    docContent.setRowCreator(() => FreeTileRow.create())
    sharedModelManager.setDocument(docContent)

    // load shared models into sharedModelManager
    const importer = new CodapV2DataSetImporter(v2Document.guidMap)
    v2Document.dataContexts.forEach(context => {
      importer.importContext(context, sharedModelManager)
    })

    mockInsertTile.mockClear()
  })

  it("handles empty components", () => {
    const noTile = v2GraphImporter({
      v2Component: {} as any,
      v2Document,
      ...mockImportArgs
    })
    expect(mockInsertTile).toHaveBeenCalledTimes(0)
    const graphModel = isGraphContentModel(noTile?.content) ? noTile?.content : undefined
    expect(graphModel).not.toBeDefined()
  })

  it("imports empty graph with no data set", () => {
    const emptyGraphFile = path.join(__dirname, "../../test/v2", "graph-no-data.codap")
    const emptyGraphJson = fs.readFileSync(emptyGraphFile, "utf8")
    const emptyGraphDoc = JSON.parse(emptyGraphJson) as ICodapV2DocumentJson

    v2Document = new CodapV2Document(emptyGraphDoc)
    sharedModelManager = new SharedModelDocumentManager()
    docContent = DocumentContentModel.create({}, { sharedModelManager })
    docContent.setRowCreator(() => FreeTileRow.create())
    sharedModelManager.setDocument(docContent)

    const tile = v2GraphImporter({
      v2Component: firstGraphComponent(v2Document),
      v2Document,
      ...mockImportArgs
    })
    expect(mockInsertTile).toHaveBeenCalledTimes(1)
    const graphModel = isGraphContentModel(tile?.content) ? tile?.content : undefined
    expect(graphModel).toBeDefined()
    expect(graphModel!.plotType).toBe("casePlot")
    expect(graphModel!.axes.size).toBe(2)
    expect(graphModel!.axes.get("bottom")?.type).toBe("empty")
    expect(graphModel!.axes.get("left")?.type).toBe("empty")
    const layer = graphModel!.layers[0] as IGraphPointLayerModel
    expect(layer.dataConfiguration.primaryRole).toBeUndefined()
    expect(layer.dataConfiguration._attributeDescriptions.size).toBe(0)
    expect(layer.dataConfiguration._yAttributeDescriptions.length).toBe(0)
  })

  it("imports empty graphs", () => {
    const tile = v2GraphImporter({
      v2Component: graphComponentWithTitle(v2Document, "Empty"),
      v2Document,
      ...mockImportArgs
    })
    expect(mockInsertTile).toHaveBeenCalledTimes(1)
    const graphModel = isGraphContentModel(tile?.content) ? tile?.content : undefined
    expect(graphModel).toBeDefined()
    expect(graphModel!.plotType).toBe("casePlot")
    expect(graphModel!.axes.size).toBe(2)
    expect(graphModel!.axes.get("bottom")?.type).toBe("empty")
    expect(graphModel!.axes.get("left")?.type).toBe("empty")
    const layer = graphModel!.layers[0] as IGraphPointLayerModel
    expect(layer.dataConfiguration.primaryRole).toBeUndefined()
    expect(layer.dataConfiguration._attributeDescriptions.size).toBe(0)
    expect(layer.dataConfiguration._yAttributeDescriptions.length).toBe(0)
  })

  it("imports numeric X graphs", done => {
    const tile = v2GraphImporter({
      v2Component: graphComponentWithTitle(v2Document, "NumX"),
      v2Document,
      ...mockImportArgs
    })
    expect(mockInsertTile).toHaveBeenCalledTimes(1)
    const graphModel = isGraphContentModel(tile?.content) ? tile?.content : undefined
    expect(graphModel).toBeDefined()
    expect(graphModel!.plotType).toBe("dotPlot")
    expect(graphModel!.axes.size).toBe(2)
    expect(graphModel!.axes.get("bottom")?.type).toBe("numeric")
    expect(graphModel!.axes.get("left")?.type).toBe("empty")
    const layer = graphModel!.layers[0] as IGraphPointLayerModel
    expect(layer.dataConfiguration.primaryRole).toBe("x")
    expect(layer.dataConfiguration._attributeDescriptions.size).toBe(1)
    expect(layer.dataConfiguration._yAttributeDescriptions.length).toBe(0)

    expect(getType(layer.dataConfiguration.dataset)).toBe(DataSet)
    expect(getType(layer.dataConfiguration.metadata)).toBe(DataSetMetadata)
    const sharedDataSet = getSharedDataSetFromDataSetId(tile, layer.dataConfiguration.dataset!.id)

    // wait a beat for reactions to run
    setTimeout(() => {
      expect(sharedModelManager!.getSharedModelTileIds(sharedDataSet)).toEqual([tile!.id])
      expect(sharedModelManager!.getSharedModelTileIds(layer.dataConfiguration.metadata)).toEqual([tile!.id])
      done()
    })
  })

  it("imports numeric Y graphs", done => {
    const tile = v2GraphImporter({
      v2Component: graphComponentWithTitle(v2Document, "NumY"),
      v2Document,
      ...mockImportArgs
    })
    expect(mockInsertTile).toHaveBeenCalledTimes(1)
    const graphModel = isGraphContentModel(tile?.content) ? tile?.content : undefined
    expect(graphModel).toBeDefined()
    expect(graphModel!.plotType).toBe("dotPlot")
    expect(graphModel!.axes.size).toBe(2)
    expect(graphModel!.axes.get("bottom")?.type).toBe("empty")
    expect(graphModel!.axes.get("left")?.type).toBe("numeric")
    const layer = graphModel!.layers[0] as IGraphPointLayerModel
    expect(layer.dataConfiguration.primaryRole).toBe("y")
    expect(layer.dataConfiguration._attributeDescriptions.size).toBe(0)
    expect(layer.dataConfiguration._yAttributeDescriptions.length).toBe(1)

    expect(getType(layer.dataConfiguration.dataset)).toBe(DataSet)
    expect(getType(layer.dataConfiguration.metadata)).toBe(DataSetMetadata)
    const sharedDataSet = getSharedDataSetFromDataSetId(tile, layer.dataConfiguration.dataset!.id)

    // wait a beat for reactions to run
    setTimeout(() => {
      expect(sharedModelManager!.getSharedModelTileIds(sharedDataSet)).toEqual([tile!.id])
      expect(sharedModelManager!.getSharedModelTileIds(layer.dataConfiguration.metadata)).toEqual([tile!.id])
      done()
    })
  })

  it("imports split double-Y graphs", done => {
    const tile = v2GraphImporter({
      v2Component: graphComponentWithTitle(v2Document, "2NumXNumYLegendCatRight"),
      v2Document,
      ...mockImportArgs
    })
    expect(mockInsertTile).toHaveBeenCalledTimes(1)
    const graphModel = isGraphContentModel(tile?.content) ? tile?.content : undefined
    expect(graphModel).toBeDefined()
    expect(graphModel!.plotType).toBe("scatterPlot")
    expect(graphModel!.axes.size).toBe(3)
    expect(graphModel!.axes.get("bottom")?.type).toBe("numeric")
    expect(graphModel!.axes.get("left")?.type).toBe("numeric")
    expect(graphModel!.axes.get("rightNumeric")?.type).toBe("numeric")
    const layer = graphModel!.layers[0] as IGraphPointLayerModel
    expect(layer.dataConfiguration.primaryRole).toBe("x")
    expect(layer.dataConfiguration._attributeDescriptions.size).toBe(3)
    expect(layer.dataConfiguration._yAttributeDescriptions.length).toBe(2)

    expect(getType(layer.dataConfiguration.dataset)).toBe(DataSet)
    expect(getType(layer.dataConfiguration.metadata)).toBe(DataSetMetadata)
    const sharedDataSet = getSharedDataSetFromDataSetId(tile, layer.dataConfiguration.dataset!.id)

    // wait a beat for reactions to run
    setTimeout(() => {
      expect(sharedModelManager!.getSharedModelTileIds(sharedDataSet)).toEqual([tile!.id])
      expect(sharedModelManager!.getSharedModelTileIds(layer.dataConfiguration.metadata)).toEqual([tile!.id])
      done()
    })
  })

  it("imports split dot charts", done => {
    const tile = v2GraphImporter({
      v2Component: graphComponentWithTitle(v2Document, "CatXCatY"),
      v2Document,
      ...mockImportArgs
    })
    expect(mockInsertTile).toHaveBeenCalledTimes(1)
    const graphModel = isGraphContentModel(tile?.content) ? tile?.content : undefined
    expect(graphModel).toBeDefined()
    expect(graphModel!.plotType).toBe("dotChart")
    expect(graphModel!.axes.size).toBe(2)
    expect(graphModel!.axes.get("bottom")?.type).toBe("categorical")
    expect(graphModel!.axes.get("left")?.type).toBe("categorical")
    const layer = graphModel!.layers[0] as IGraphPointLayerModel
    expect(layer.dataConfiguration.primaryRole).toBe("x")
    expect(layer.dataConfiguration._attributeDescriptions.size).toBe(1)
    expect(layer.dataConfiguration._yAttributeDescriptions.length).toBe(1)

    expect(getType(layer.dataConfiguration.dataset)).toBe(DataSet)
    expect(getType(layer.dataConfiguration.metadata)).toBe(DataSetMetadata)
    const sharedDataSet = getSharedDataSetFromDataSetId(tile, layer.dataConfiguration.dataset!.id)

    // wait a beat for reactions to run
    setTimeout(() => {
      expect(sharedModelManager!.getSharedModelTileIds(sharedDataSet)).toEqual([tile!.id])
      expect(sharedModelManager!.getSharedModelTileIds(layer.dataConfiguration.metadata)).toEqual([tile!.id])
      done()
    })
  })

  it("imports top-split dot charts", done => {
    const tile = v2GraphImporter({
      v2Component: graphComponentWithTitle(v2Document, "CatXCatYCatTop"),
      v2Document,
      ...mockImportArgs
    })
    expect(mockInsertTile).toHaveBeenCalledTimes(1)
    const graphModel = isGraphContentModel(tile?.content) ? tile?.content : undefined
    expect(graphModel).toBeDefined()
    expect(graphModel!.plotType).toBe("dotChart")
    expect(graphModel!.axes.size).toBe(3)
    expect(graphModel!.axes.get("bottom")?.type).toBe("categorical")
    expect(graphModel!.axes.get("left")?.type).toBe("categorical")
    expect(graphModel!.axes.get("top")?.type).toBe("categorical")
    const layer = graphModel!.layers[0] as IGraphPointLayerModel
    expect(layer.dataConfiguration.primaryRole).toBe("x")
    expect(layer.dataConfiguration._attributeDescriptions.size).toBe(2)
    expect(layer.dataConfiguration._yAttributeDescriptions.length).toBe(1)

    expect(getType(layer.dataConfiguration.dataset)).toBe(DataSet)
    expect(getType(layer.dataConfiguration.metadata)).toBe(DataSetMetadata)
    const sharedDataSet = getSharedDataSetFromDataSetId(tile, layer.dataConfiguration.dataset!.id)

    // wait a beat for reactions to run
    setTimeout(() => {
      expect(sharedModelManager!.getSharedModelTileIds(sharedDataSet)).toEqual([tile!.id])
      expect(sharedModelManager!.getSharedModelTileIds(layer.dataConfiguration.metadata)).toEqual([tile!.id])
      done()
    })
  })

  it("imports right-split dot charts", done => {
    const tile = v2GraphImporter({
      v2Component: graphComponentWithTitle(v2Document, "CatXCatYCatRight"),
      v2Document,
      ...mockImportArgs
    })
    expect(mockInsertTile).toHaveBeenCalledTimes(1)
    const graphModel = isGraphContentModel(tile?.content) ? tile?.content : undefined
    expect(graphModel).toBeDefined()
    expect(graphModel!.plotType).toBe("dotChart")
    expect(graphModel!.axes.size).toBe(3)
    expect(graphModel!.axes.get("bottom")?.type).toBe("categorical")
    expect(graphModel!.axes.get("left")?.type).toBe("categorical")
    expect(graphModel!.axes.get("rightCat")?.type).toBe("categorical")
    const layer = graphModel!.layers[0] as IGraphPointLayerModel
    expect(layer.dataConfiguration.primaryRole).toBe("x")
    expect(layer.dataConfiguration._attributeDescriptions.size).toBe(2)
    expect(layer.dataConfiguration._yAttributeDescriptions.length).toBe(1)

    expect(getType(layer.dataConfiguration.dataset)).toBe(DataSet)
    expect(getType(layer.dataConfiguration.metadata)).toBe(DataSetMetadata)
    const sharedDataSet = getSharedDataSetFromDataSetId(tile, layer.dataConfiguration.dataset!.id)

    // wait a beat for reactions to run
    setTimeout(() => {
      expect(sharedModelManager!.getSharedModelTileIds(sharedDataSet)).toEqual([tile!.id])
      expect(sharedModelManager!.getSharedModelTileIds(layer.dataConfiguration.metadata)).toEqual([tile!.id])
      done()
    })
  })

  describe("imports bar chart axis types from V2", () => {
    const barChartsFile = path.join(__dirname, "../../test/v2", "mammals-bar-charts.codap")
    const barChartsJson = fs.readFileSync(barChartsFile, "utf8")
    const barChartsDoc = safeJsonParse<ICodapV2DocumentJson>(barChartsJson)!

    let barV2Document: CodapV2Document
    let barDocContent: IDocumentContentModel | undefined
    let barSharedModelManager: SharedModelDocumentManager | undefined

    beforeEach(() => {
      barV2Document = new CodapV2Document(barChartsDoc)
      barSharedModelManager = new SharedModelDocumentManager()
      barDocContent = DocumentContentModel.create({}, { sharedModelManager: barSharedModelManager })
      barDocContent.setRowCreator(() => FreeTileRow.create())
      barSharedModelManager.setDocument(barDocContent)

      const importer = new CodapV2DataSetImporter(barV2Document.guidMap)
      barV2Document.dataContexts.forEach(context => {
        importer.importContext(context, barSharedModelManager)
      })

      mockInsertTile.mockClear()
      mockInsertTile.mockImplementation((tileSnap: ITileModelSnapshotIn) => {
        return barDocContent!.insertTileSnapshotInDefaultRow(tileSnap)
      })
    })

    function importBarChart(title: string) {
      const component = barV2Document.components.find(c => c.componentStorage?.title === title)!
      const tile = v2GraphImporter({
        v2Component: component,
        v2Document: barV2Document,
        getCaseData: (dataContextGuid: number) =>
          getCaseDataFromV2ContextGuid(dataContextGuid, barSharedModelManager),
        getGlobalValues: mockGetGlobalValues,
        insertTile: mockInsertTile,
        linkSharedModel: (tileContent: ITileContentModel, sharedModel?: ISharedModel, isProvider?: boolean) => {
          if (sharedModel) {
            barSharedModelManager?.addTileSharedModel(tileContent, sharedModel, isProvider)
          }
        }
      })
      const graphModel = isGraphContentModel(tile?.content) ? tile?.content : undefined
      return graphModel!
    }

    it("imports count bar chart with count axis", () => {
      const graphModel = importBarChart("BarChart-Count")
      expect(graphModel.plotType).toBe("barChart")
      const plot = graphModel.plot
      expect(isBarChartModel(plot)).toBe(true)
      expect((plot as any).breakdownType).toBe("count")
      expect(graphModel.axes.get("left")?.type).toBe("count")
    })

    it("imports percent bar chart with percent axis", () => {
      const graphModel = importBarChart("BarChart-Percent")
      expect(graphModel.plotType).toBe("barChart")
      const plot = graphModel.plot
      expect(isBarChartModel(plot)).toBe(true)
      expect((plot as any).breakdownType).toBe("percent")
      expect(graphModel.axes.get("left")?.type).toBe("percent")
    })

    it("imports formula bar chart with numeric axis", () => {
      const graphModel = importBarChart("BarChart-Formula")
      expect(graphModel.plotType).toBe("barChart")
      const plot = graphModel.plot
      expect(isBarChartModel(plot)).toBe(true)
      expect((plot as any).breakdownType).toBe("formula")
      expect(graphModel.axes.get("left")?.type).toBe("numeric")
    })

    it("imports count bar chart with split and count axis", () => {
      const graphModel = importBarChart("BarChart-Count-SplitRight")
      expect(graphModel.plotType).toBe("barChart")
      expect((graphModel.plot as any).breakdownType).toBe("count")
      expect(graphModel.axes.get("left")?.type).toBe("count")
    })

    it("imports percent bar chart with split and percent axis", () => {
      const graphModel = importBarChart("BarChart-Percent-SplitRight")
      expect(graphModel.plotType).toBe("barChart")
      expect((graphModel.plot as any).breakdownType).toBe("percent")
      expect(graphModel.axes.get("left")?.type).toBe("percent")
    })

    it("imports formula bar chart with split and numeric axis", () => {
      const graphModel = importBarChart("BarChartFormula-SplitRight")
      expect(graphModel.plotType).toBe("barChart")
      expect((graphModel.plot as any).breakdownType).toBe("formula")
      expect(graphModel.axes.get("left")?.type).toBe("numeric")
    })
  })
})
