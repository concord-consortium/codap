import {ITileModelSnapshotIn} from "../../models/tiles/tile-model"
import {V2TileImportArgs} from "../../v2/codap-v2-tile-importers"
import {ICodapV2GraphStorage, IGuidLink, isV2GraphComponent, v3TypeFromV2TypeIndex} from "../../v2/codap-v2-types"
import {GraphAttrRole, PrimaryAttrRole, axisPlaceToAttrRole} from "../data-display/data-display-types"
import {kGraphTileType} from "./graph-defs"
import {PlotType} from "./graphing-types"
import {IGraphContentModelSnapshot} from "./models/graph-content-model"
import {kGraphDataConfigurationType} from "./models/graph-data-configuration-model"
import {kGraphPointLayerType} from "./models/graph-point-layer-model"
import {IAttributeDescriptionSnapshot} from "../data-display/models/data-configuration-model"
import {AxisPlace} from "../axis/axis-types"
import {IAxisModelSnapshotUnion} from "../axis/models/axis-model"
import {v2AdornmentImporter} from "./adornments/v2-adornment-importer"
import {defaultBackgroundColor} from "../../utilities/color-utils"

export function v2GraphImporter({v2Component, v2Document, sharedModelManager, insertTile}: V2TileImportArgs) {
  if (!isV2GraphComponent(v2Component)) return

  const {
    guid,

    componentStorage: {
      title = "", _links_: links, plotModels,

      pointColor, strokeColor, pointSizeMultiplier,
      strokeSameAsFill, isTransparent,
      plotBackgroundImageLockInfo,
  /* The following are present in the componentStorage but not used in the V3 content model (yet):
      displayOnlySelected, legendRole, legendAttributeType, numberOfLegendQuantiles,
      legendQuantilesAreLocked, plotBackgroundImage, transparency, strokeTransparency,
      plotBackgroundOpacity,
  */
    }
  } = v2Component
  const plotBackgroundColor: string | null | undefined = v2Component.componentStorage.plotBackgroundColor ||
    defaultBackgroundColor
  type TLinksKey = keyof typeof links
  const contextId = links.context?.id
  const {data, metadata} = v2Document.getDataAndMetadata(contextId)

  const roleFromAttrKey: Record<string, GraphAttrRole> = {
    x: "x",
    y: "y",
    y2: "rightNumeric",
    legend: "legend",
    top: "topSplit",
    right: "rightSplit"
  }
  const axes: Partial<Record<AxisPlace, IAxisModelSnapshotUnion>> = {}
  let primaryRole: PrimaryAttrRole | undefined
  const _attributeDescriptions: Partial<Record<GraphAttrRole, IAttributeDescriptionSnapshot>> = {}
  const _yAttributeDescriptions: IAttributeDescriptionSnapshot[] = []

    // configure attributes
  ;(Object.keys(links) as TLinksKey[]).forEach((aKey: TLinksKey) => {
    if (['xAttr', 'yAttr', 'y2Attr', 'legendAttr', 'topAttr', 'rightAttr'].includes(aKey)) {
      const attrKey = aKey.match(/[a-z2]+/)?.[0]  // matches before the "Attr"
      if (!attrKey) return
      const
        v3AttrRole = roleFromAttrKey[attrKey] || 'x',
        v2AttrArray = (Array.isArray(links[aKey]) ? links[aKey] : [links[aKey]]) as IGuidLink<"DG.Attribute">[]
      v2AttrArray.forEach((aLink: IGuidLink<"DG.Attribute">) => {
        const v2AttrId = aLink.id,
          attribute = v2Document.getV3Attribute(v2AttrId),
          v3AttrId = attribute?.id ?? '',
          attrRoleKey = `${attrKey}Role` as keyof ICodapV2GraphStorage,
          v2Role = v2Component.componentStorage[attrRoleKey],
          attrTypeKey = `${attrKey}AttributeType` as keyof ICodapV2GraphStorage,
          v2Type = v2Component.componentStorage[attrTypeKey],
          v3Type = v3TypeFromV2TypeIndex[v2Type]
        if (v3AttrRole && v3AttrId && v3Type) {
          const v2PrimaryNumeric = 1
          const v2PrimaryCategorical = 3
          if (["x", "y"].includes(attrKey) && (v2Role === v2PrimaryNumeric || v2Role === v2PrimaryCategorical)) {
            primaryRole = attrKey as PrimaryAttrRole
          }
          if (["y", "yPlus"].includes(v3AttrRole)) {
            _yAttributeDescriptions.push({attributeID: v3AttrId, type: v3Type})
          } else {
            _attributeDescriptions[v3AttrRole] = {attributeID: v3AttrId, type: v3Type}
          }
        }
      })
    }
  })

  // configure axes
  const v3PlaceFromV2Place: Record<string, AxisPlace> = {
    x: "bottom",
    y: "left",
    y2: "rightNumeric",
    top: "top",
    right: "rightCat"
  }

  function hasAttributeForV3Place(v3Place: AxisPlace) {
    const role = axisPlaceToAttrRole[v3Place]
    return v3Place === "left" ? !!_yAttributeDescriptions[0] : !!_attributeDescriptions[role]
  }

  ["x", "y", "y2", "top", "right"].forEach(v2Place => {
    const v3Place = v3PlaceFromV2Place[v2Place]
    const axisClass = v2Component.componentStorage[`${v2Place}AxisClass` as keyof ICodapV2GraphStorage]
    const lowerBound = v2Component.componentStorage[`${v2Place}LowerBound` as keyof ICodapV2GraphStorage]
    const upperBound = v2Component.componentStorage[`${v2Place}UpperBound` as keyof ICodapV2GraphStorage]
    if (v3Place && axisClass && hasAttributeForV3Place(v3Place)) {
      switch (axisClass) {
        case "DG.CellAxisModel":
          axes[v3Place] = {place: v3Place, type: "categorical"}
          break
        case "DG.CellLinearAxisModel":
          axes[v3Place] = {place: v3Place, type: "numeric", min: lowerBound, max: upperBound}
          break
      }
    }
  })
  // use empty axes for left/bottom if there are no other axes there
  ;(["bottom", "left"] as const).forEach(place => {
    if (!axes[place]) axes[place] = {place, type: "empty"}
  })

  // configure plot

  // keys are [primaryAxisType][secondaryAxisType]
  const plotChoices: Record<string, Record<string, PlotType>> = {
    empty: {empty: 'casePlot', numeric: 'dotPlot', categorical: 'dotChart'},
    numeric: {empty: 'dotPlot', numeric: 'scatterPlot', categorical: 'dotPlot'},
    categorical: {empty: 'dotChart', numeric: 'dotPlot', categorical: 'dotChart'}
  }
  const plotType = plotChoices[axes.bottom?.type ?? "empty"][axes.left?.type ?? "empty"]

  // configure adornmentsStore
  const adornmentImporterProps = {
    data, plotModels,
    attributeDescriptions: _attributeDescriptions,
    yAttributeDescriptions: _yAttributeDescriptions
  }
  const adornmentsStore = v2AdornmentImporter(adornmentImporterProps)

  const content: IGraphContentModelSnapshot = {
    type: kGraphTileType,
    adornmentsStore,
    axes,
    plotType,
    plotBackgroundColor,
    // plotBackgroundOpacity,
    // plotBackgroundImage,
    plotBackgroundImageLockInfo,
    isTransparent: isTransparent ?? false,
    /*
    * displayOnlySelected,legendRole, legendAttributeType, numberOfLegendQuantiles, legendQuantilesAreLocked,
    * */
    pointDescription: {
      _itemColors: pointColor ? [pointColor] : [],
      _itemStrokeColor: strokeColor,
      _pointSizeMultiplier: pointSizeMultiplier,
      /*transparency, strokeTransparency*/
      _itemStrokeSameAsFill: strokeSameAsFill
    },
    layers: [{
      type: kGraphPointLayerType,
      dataConfiguration: {
        type: kGraphDataConfigurationType,
        dataset: data?.dataSet.id,
        metadata: metadata?.id,
        primaryRole,
        _attributeDescriptions,
        _yAttributeDescriptions
      }
    }]
  }

  const graphTileSnap: ITileModelSnapshotIn = { id: `${guid}`, title, content }
  const graphTile = insertTile(graphTileSnap)

  // link shared model
  if (sharedModelManager && graphTile) {
    data && sharedModelManager.addTileSharedModel(graphTile.content, data, false)
    metadata && sharedModelManager.addTileSharedModel(graphTile.content, metadata, false)
  }

  return graphTile
}
