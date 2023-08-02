// import { getType } from "mobx-state-tree"
import { CodapV2Document } from "../../v2/codap-v2-document"
import { ICodapV2DocumentJson } from "../../v2/codap-v2-types"
import {isGraphContentModel} from "./models/graph-content-model"
// import { CategoricalAxisModel, EmptyAxisModel, NumericAxisModel } from "../axis/models/axis-model"
import { v2GraphImporter } from "./v2-graph-importer"
import "./graph-registration"

const fs = require("fs")
const path = require("path")

function graphComponentWithTitle(v2Document: CodapV2Document, title: string) {
  return v2Document.components.find(c => c.componentStorage.title === title)!
}

describe("V2GraphImporter", () => {
  const file = path.join(__dirname, "../../test/v2", "mammals-graphs.codap")
  const mammalsJson = fs.readFileSync(file, "utf8")
  const mammalsDoc = JSON.parse(mammalsJson) as ICodapV2DocumentJson
  const v2Document = new CodapV2Document(mammalsDoc)
  const mockInsertTile = jest.fn()

  beforeEach(() => {
    mockInsertTile.mockClear()
  })

  it("handles empty components", () => {
    const noTile = v2GraphImporter({
      v2Component: {} as any,
      v2Document,
      insertTile: mockInsertTile
    })
    expect(mockInsertTile).toHaveBeenCalledTimes(0)
    const graphContentModel = isGraphContentModel(noTile?.content) ? noTile?.content : undefined
    expect(graphContentModel).not.toBeDefined()
  })

  it("imports empty graphs", () => {
    /* const tile = */ v2GraphImporter({
      v2Component: graphComponentWithTitle(v2Document, "Empty"),
      v2Document,
      insertTile: mockInsertTile
    })
    expect(mockInsertTile).toHaveBeenCalledTimes(1)
/*
    const graphContentModel = isGraphContentModel(tile?.content) ? tile?.content : undefined
    expect(graphContentModel).toBeDefined()
    expect(graphContentModel?.plotType).toBe("casePlot")
    expect(graphContentModel?.axes.size).toBe(2)
    expect(getType(graphContentModel?.axes.get("bottom"))).toBe(EmptyAxisModel)
    expect(getType(graphContentModel?.axes.get("left"))).toBe(EmptyAxisModel)
    expect(graphContentModel?.config.primaryRole).toBeUndefined()
    expect(graphContentModel?.config._attributeDescriptions.size).toBe(0)
    expect(graphContentModel?.config._yAttributeDescriptions.length).toBe(0)
*/
  })

  it("imports numeric X graphs", () => {
    const tile = v2GraphImporter({
      v2Component: graphComponentWithTitle(v2Document, "NumX"),
      v2Document,
      insertTile: mockInsertTile
    })
    expect(mockInsertTile).toHaveBeenCalledTimes(1)
    const graphContentModel = isGraphContentModel(tile?.content) ? tile?.content : undefined
    expect(graphContentModel).toBeDefined()
/*
    expect(graphContentModel?.plotType).toBe("dotPlot")
    expect(graphContentModel?.axes.size).toBe(2)
    expect(getType(graphContentModel?.axes.get("bottom"))).toBe(NumericAxisModel)
    expect(getType(graphContentModel?.axes.get("left"))).toBe(EmptyAxisModel)
    expect(graphContentModel?.config.primaryRole).toBe("x")
    expect(graphContentModel?.config._attributeDescriptions.size).toBe(1)
    expect(graphContentModel?.config._yAttributeDescriptions.length).toBe(0)
*/
  })

  it("imports numeric Y graphs", () => {
    const tile = v2GraphImporter({
      v2Component: graphComponentWithTitle(v2Document, "NumY"),
      v2Document,
      insertTile: mockInsertTile
    })
    expect(mockInsertTile).toHaveBeenCalledTimes(1)
    const graphContentModel = isGraphContentModel(tile?.content) ? tile?.content : undefined
    expect(graphContentModel).toBeDefined()
/*
    expect(graphContentModel?.plotType).toBe("dotPlot")
    expect(graphContentModel?.axes.size).toBe(2)
    expect(getType(graphContentModel?.axes.get("bottom"))).toBe(EmptyAxisModel)
    expect(getType(graphContentModel?.axes.get("left"))).toBe(NumericAxisModel)
    expect(graphContentModel?.config.primaryRole).toBe("y")
    expect(graphContentModel?.config._attributeDescriptions.size).toBe(0)
    expect(graphContentModel?.config._yAttributeDescriptions.length).toBe(1)
*/
  })

  it("imports split double-Y graphs", () => {
    const tile = v2GraphImporter({
      v2Component: graphComponentWithTitle(v2Document, "2NumXNumYLegendCatRight"),
      v2Document,
      insertTile: mockInsertTile
    })
    expect(mockInsertTile).toHaveBeenCalledTimes(1)
    const graphContentModel = isGraphContentModel(tile?.content) ? tile?.content : undefined
    expect(graphContentModel).toBeDefined()
/*
    expect(graphContentModel?.plotType).toBe("scatterPlot")
    expect(graphContentModel?.axes.size).toBe(3)
    expect(getType(graphContentModel?.axes.get("bottom"))).toBe(NumericAxisModel)
    expect(getType(graphContentModel?.axes.get("left"))).toBe(NumericAxisModel)
    expect(getType(graphContentModel?.axes.get("rightNumeric"))).toBe(NumericAxisModel)
    expect(graphContentModel?.config.primaryRole).toBe("x")
    expect(graphContentModel?.config._attributeDescriptions.size).toBe(3)
    expect(graphContentModel?.config._yAttributeDescriptions.length).toBe(2)
*/
  })

  it("imports split dot charts", () => {
    const tile = v2GraphImporter({
      v2Component: graphComponentWithTitle(v2Document, "CatXCatY"),
      v2Document,
      insertTile: mockInsertTile
    })
    expect(mockInsertTile).toHaveBeenCalledTimes(1)
    const graphContentModel = isGraphContentModel(tile?.content) ? tile?.content : undefined
    expect(graphContentModel).toBeDefined()
/*
    expect(graphContentModel?.plotType).toBe("dotChart")
    expect(graphContentModel?.axes.size).toBe(2)
    expect(getType(graphContentModel?.axes.get("bottom"))).toBe(CategoricalAxisModel)
    expect(getType(graphContentModel?.axes.get("left"))).toBe(CategoricalAxisModel)
    expect(graphContentModel?.config.primaryRole).toBe("x")
    expect(graphContentModel?.config._attributeDescriptions.size).toBe(1)
    expect(graphContentModel?.config._yAttributeDescriptions.length).toBe(1)
*/
  })

  it("imports top-split dot charts", () => {
    const tile = v2GraphImporter({
      v2Component: graphComponentWithTitle(v2Document, "CatXCatYCatTop"),
      v2Document,
      insertTile: mockInsertTile
    })
    expect(mockInsertTile).toHaveBeenCalledTimes(1)
    const graphContentModel = isGraphContentModel(tile?.content) ? tile?.content : undefined
    expect(graphContentModel).toBeDefined()
/*
    expect(graphContentModel?.plotType).toBe("dotChart")
    expect(graphContentModel?.axes.size).toBe(3)
    expect(getType(graphContentModel?.axes.get("bottom"))).toBe(CategoricalAxisModel)
    expect(getType(graphContentModel?.axes.get("left"))).toBe(CategoricalAxisModel)
    expect(getType(graphContentModel?.axes.get("top"))).toBe(CategoricalAxisModel)
    expect(graphContentModel?.config.primaryRole).toBe("x")
    expect(graphContentModel?.config._attributeDescriptions.size).toBe(2)
    expect(graphContentModel?.config._yAttributeDescriptions.length).toBe(1)
*/
  })

  it("imports right-split dot charts", () => {
    const tile = v2GraphImporter({
      v2Component: graphComponentWithTitle(v2Document, "CatXCatYCatRight"),
      v2Document,
      insertTile: mockInsertTile
    })
    expect(mockInsertTile).toHaveBeenCalledTimes(1)
    const graphContentModel = isGraphContentModel(tile?.content) ? tile?.content : undefined
    expect(graphContentModel).toBeDefined()
/*
    expect(graphContentModel?.plotType).toBe("dotChart")
    expect(graphContentModel?.axes.size).toBe(3)
    expect(getType(graphContentModel?.axes.get("bottom"))).toBe(CategoricalAxisModel)
    expect(getType(graphContentModel?.axes.get("left"))).toBe(CategoricalAxisModel)
    expect(getType(graphContentModel?.axes.get("rightCat"))).toBe(CategoricalAxisModel)
    expect(graphContentModel?.config.primaryRole).toBe("x")
    expect(graphContentModel?.config._attributeDescriptions.size).toBe(2)
    expect(graphContentModel?.config._yAttributeDescriptions.length).toBe(1)
*/
  })
})
