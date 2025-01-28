import { SetRequired } from "type-fest"
import { AttributeType } from "../../models/data/attribute-types"
import { toV2Id } from "../../utilities/codap-utils"
import { V2TileExportFn } from "../../v2/codap-v2-tile-exporters"
import { guidLink, ICodapV2GraphStorage, IGuidLink } from "../../v2/codap-v2-types"
import { IAxisModel, isNumericAxisModel } from "../axis/models/axis-model"
import { GraphAttrRole } from "../data-display/data-display-types"
import { PlotType } from "./graphing-types"
import { IGraphContentModel, isGraphContentModel } from "./models/graph-content-model"

type V2GraphDimension = "x" | "y" | "y2" | "top" | "right" | "legend"

// map from v3 attribute type to v2 numeric attribute type
const v2TypesMap: Partial<Record<AttributeType, number>> = {
  numeric: 1,
  categorical: 2,
  date: 3,
  boundary: 4,
  color: 5
}

// v2 role constants
const v2Roles: Record<string, number> = {
  eInvalid: -1,
  eNone: 0,
  ePrimaryNumeric: 1,
  eSecondaryNumeric: 2,
  ePrimaryCategorical: 3,
  eSecondaryCategorical: 4,
  // eLegendNumeric: 5,
  // eLegendCategorical: 6,
  // eVerticalSplit: 7,      // for attribute in place DG.GraphTypes.EPlace.eTopSplit
  // eHorizontalSplit: 8     // for attribute in place DG.GraphTypes.EPlace.eRightSplit
}

const v2PlotClass: Record<PlotType, string> = {
  casePlot: "DG.CasePlotModel",
  dotPlot: "DG.DotPlotModel",
  dotChart: "DG.DotChartModel",
  scatterPlot: "DG.ScatterPlotModel"
}

type AttributeRoleAndType = Partial<ICodapV2GraphStorage>

function getAttrRoleAndType(
  graph: IGraphContentModel, role: GraphAttrRole, dim: V2GraphDimension
): Maybe<AttributeRoleAndType> {
  const { dataset } = graph
  if (dataset) {
    let v2Role = 0
    const type = graph.dataConfiguration.attributeType(role)
    const isPrimary = role === graph.dataConfiguration.primaryRole
    const v2Type = (type && v2TypesMap[type]) ?? v2Roles.eNone
    switch (role) {
      case "x":
      case "y":
        // special case for empty graph
        if (!graph.dataConfiguration.attributeType("x") && !graph.dataConfiguration.attributeType("y")) {
          v2Role = v2Roles.eNone
        }
        else {
          // note: v2 writes out all secondary axis roles as eSecondaryCategorical, even with no attribute
          v2Role = type === "numeric"
                    ? isPrimary ? v2Roles.ePrimaryNumeric : v2Roles.eSecondaryCategorical
                    : isPrimary ? v2Roles.ePrimaryCategorical : v2Roles.eSecondaryCategorical
        }
        break
      case "rightNumeric":
      case "legend":
      case "rightSplit":
      case "topSplit":
        // v2 always writes out 0 for these roles
        v2Role = v2Roles.eNone
        break
    }
    return {
      [`${dim}Role`]: v2Role,
      [`${dim}AttributeType`]: v2Type
    }
  }
}

type V2GraphLinks = ICodapV2GraphStorage["_links_"]

function getAttrLinksForRole(graph: IGraphContentModel, role: GraphAttrRole, prefix: string): V2GraphLinks {
  const { dataset } = graph
  if (dataset) {
    const collectionKey = `${prefix}Coll`
    const attributeKey = `${prefix}Attr`
    const attrId = graph.dataConfiguration.attributeID(role)
    const collection = dataset.getCollectionForAttribute(attrId)
    if (attrId && collection) {
      let attributeLinks: IGuidLink<"DG.Attribute"> | Array<IGuidLink<"DG.Attribute">>
      if (role === "y" && graph.dataConfiguration.yAttributeDescriptionsExcludingY2.length > 1) {
        attributeLinks = graph.dataConfiguration.yAttributeDescriptionsExcludingY2
                          .map(({ attributeID }) => guidLink("DG.Attribute", toV2Id(attributeID)))
      }
      else {
        attributeLinks = guidLink("DG.Attribute", toV2Id(attrId))
      }
      return {
        [collectionKey]: guidLink("DG.Collection", toV2Id(collection.id)),
        [attributeKey]: attributeLinks
      }
    }
  }
  return {}
}

function getLinks(graph: IGraphContentModel): ICodapV2GraphStorage["_links_"] {
  const { dataset } = graph
  if (dataset) {
    return {
      context: guidLink("DG.DataContextRecord", toV2Id(dataset.id)),
      // TODO: hiddenCases
      hiddenCases: [],
      ...getAttrLinksForRole(graph, "x", "x"),
      ...getAttrLinksForRole(graph, "y", "y"),
      ...getAttrLinksForRole(graph, "rightNumeric", "y2"),
      ...getAttrLinksForRole(graph, "rightSplit", "right"),
      ...getAttrLinksForRole(graph, "topSplit", "top"),
      ...getAttrLinksForRole(graph, "legend", "legend")
    }
  }
  return {}
}

type AxisClassAndBounds = Partial<ICodapV2GraphStorage>

function getAxisClassAndBounds(
  graph: IGraphContentModel, dim: V2GraphDimension, axis?: IAxisModel
): AxisClassAndBounds {
  const axisClass = axis?.isNumeric
                      ? "DG.CellLinearAxisModel"
                      : axis?.isCategorical || ["top", "right"].includes(dim)
                        ? "DG.CellAxisModel"
                        : "DG.AxisModel"
  const axisBounds = isNumericAxisModel(axis)
                      ? {
                        [`${dim}LowerBound`]: axis.min,
                        [`${dim}UpperBound`]: axis.max
                      }
                      : {}
  return {
    [`${dim}AxisClass`]: axisClass,
    ...axisBounds
  }
}

function getPlotModels(graph: IGraphContentModel): Partial<ICodapV2GraphStorage> {
  const storage: SetRequired<Partial<ICodapV2GraphStorage>, "plotModels"> = {
    plotModels: [{
      plotClass: v2PlotClass[graph.plotType],
      plotModelStorage: {
        verticalAxisIsY2: false
      }
    }]
  }
  // in v2, additional Y attributes are represented as additional plot models
  for (let y = 1; y < graph.dataConfiguration.yAttributeDescriptionsExcludingY2.length; y++) {
    storage.plotModels.push({
      plotClass: v2PlotClass.scatterPlot,
      plotModelStorage: {
        verticalAxisIsY2: false
      }
    })
  }
  // in v2, a rightNumeric attribute is represented as an additional plot model
  if (graph.getAttributeID("rightNumeric")) {
    storage.plotModels.push({
      plotClass: v2PlotClass.scatterPlot,
      plotModelStorage: {
        verticalAxisIsY2: true
      }
    })
  }
  return storage
}

export const v2GraphExporter: V2TileExportFn = ({ tile }) => {
  const graph = isGraphContentModel(tile.content) ? tile.content : undefined
  if (!graph) return

  const componentStorage: Partial<ICodapV2GraphStorage> = {
    _links_: getLinks(graph),
    displayOnlySelected: !!graph.dataConfiguration.displayOnlySelectedCases,
    // attribute roles and types
    ...getAttrRoleAndType(graph, "x", "x"),
    ...getAttrRoleAndType(graph, "y", "y"),
    ...getAttrRoleAndType(graph, "rightNumeric", "y2"),
    ...getAttrRoleAndType(graph, "rightSplit", "right"),
    ...getAttrRoleAndType(graph, "topSplit", "top"),
    ...getAttrRoleAndType(graph, "legend", "legend"),
    // axis classes and bounds
    ...getAxisClassAndBounds(graph, "x", graph.axes.get("bottom")),
    ...getAxisClassAndBounds(graph, "y", graph.axes.get("left")),
    ...getAxisClassAndBounds(graph, "y2", graph.axes.get("rightNumeric")),
    ...getAxisClassAndBounds(graph, "top", graph.axes.get("topSplit")),
    ...getAxisClassAndBounds(graph, "right", graph.axes.get("rightSplit")),
    // plot models
    ...getPlotModels(graph)
  }

  return { type: "DG.GraphView", componentStorage }
}
