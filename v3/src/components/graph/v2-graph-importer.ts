import {ITileModelSnapshotIn} from "../../models/tiles/tile-model"
import {toV3Id} from "../../utilities/codap-utils"
import {defaultBackgroundColor, parseColorToHex} from "../../utilities/color-utils"
import {V2TileImportArgs} from "../../v2/codap-v2-tile-importers"
import {IGuidLink, isV2GraphComponent} from "../../v2/codap-v2-types"
import {v3TypeFromV2TypeIndex} from "../../v2/codap-v2-data-set-types"
import {GraphAttrRole, PrimaryAttrRole, axisPlaceToAttrRole} from "../data-display/data-display-types"
import {kGraphIdPrefix, kGraphTileType} from "./graph-defs"
import {IGraphContentModelSnapshot} from "./models/graph-content-model"
import {kGraphDataConfigurationType} from "./models/graph-data-configuration-model"
import {kGraphPointLayerType} from "./models/graph-point-layer-model"
import {GraphAttributeDescriptionsMapSnapshot, IAttributeDescriptionSnapshot}
  from "../data-display/models/data-configuration-model"
import {AxisPlace} from "../axis/axis-types"
import {IAxisModelSnapshotUnion} from "../axis/models/axis-model"
import {v2AdornmentImporter} from "./adornments/v2-adornment-importer"
import { v2PlotImporter } from "./v2-plot-importer"

const attrKeys = ["x", "y", "y2", "legend", "top", "right"] as const
type AttrKey = typeof attrKeys[number]
function isAttrKey(key: string | undefined): key is AttrKey {
  // attrKeys is made a more generic readonly string[] so we can
  // call includes with any string
  if (!key) return false
  return (attrKeys as readonly string[]).includes(key)
}

const v2GraphPlaces = ["x", "y", "y2", "top", "right"] as const
type V2GraphPlace = typeof v2GraphPlaces[number]

const v2GraphPlacesWithBounds = ["x", "y", "y2"] as const
type V2GraphPlaceWithBounds = typeof v2GraphPlacesWithBounds[number]
function isV2PlaceWithBounds(place: V2GraphPlace): place is V2GraphPlaceWithBounds {
  // v2GraphPlacesWithBounds is made a more generic readonly V2GraphPlace[] so we can
  // call includes with any V2GraphPlace
  return (v2GraphPlacesWithBounds as readonly V2GraphPlace[]).includes(place)
}

export function v2GraphImporter({v2Component, v2Document, sharedModelManager, insertTile}: V2TileImportArgs) {
  if (!isV2GraphComponent(v2Component)) return

  const {
    guid,

    componentStorage: {
      name, title = "", _links_: links, plotModels, cannotClose,
      pointColor, transparency, strokeColor, strokeTransparency, pointSizeMultiplier,
      strokeSameAsFill, isTransparent,
      plotBackgroundImageLockInfo,
  /* TODO_V2_IMPORT: [Story: #188694812]
      The following are present in the componentStorage but not used in the V3 content model (yet):
      displayOnlySelected, numberOfLegendQuantiles, legendQuantilesAreLocked, plotBackgroundImage
  */
    }
  } = v2Component
  const plotBackgroundOpacity = v2Component.componentStorage.plotBackgroundOpacity ?? 1
  const plotBackgroundColor =
            (v2Component.componentStorage.plotBackgroundColor &&
                parseColorToHex(v2Component.componentStorage.plotBackgroundColor, {alpha: plotBackgroundOpacity})) ||
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
  const _attributeDescriptions: GraphAttributeDescriptionsMapSnapshot = {}
  const _yAttributeDescriptions: IAttributeDescriptionSnapshot[] = []

    // configure attributes
  ;(Object.keys(links) as TLinksKey[]).forEach((linksKey) => {
    const attrKey = linksKey.match(/^([a-z2]+)Attr$/)?.[1] // matches before the "Attr"
    if (!isAttrKey(attrKey) || !links[linksKey]) return

    const aKey = linksKey as `${AttrKey}Attr`

    const
      v3AttrRole = roleFromAttrKey[attrKey] || 'x',
      v2AttrArray = (Array.isArray(links[aKey]) ? links[aKey] : [links[aKey]]) as IGuidLink<"DG.Attribute">[]
    v2AttrArray.forEach((aLink) => {
      const v2AttrId = aLink.id,
        attribute = v2Document.getV3Attribute(v2AttrId),
        v3AttrId = attribute?.id ?? '',
        v2Role = v2Component.componentStorage[`${attrKey}Role`],
        v2Type = v2Component.componentStorage[`${attrKey}AttributeType`]
      if (v2Type != null && v3AttrRole && v3AttrId) {
        const v3Type = v3TypeFromV2TypeIndex[v2Type]
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

  })

  // configure axes
  const v3PlaceFromV2Place: Record<string, AxisPlace> = {
    x: "bottom",
    y: "left",
    y2: "rightNumeric",
    top: "top",
    right: "rightCat"
  }

  function requiresAxisForV3Place(v3Place: AxisPlace, axisClass?: string) {
    if (!axisClass) return false
    if (["DG.CountAxisModel", "DG.FormulaAxisModel"].includes(axisClass)) return true
    const role = axisPlaceToAttrRole[v3Place]
    return v3Place === "left" ? !!_yAttributeDescriptions[0] : !!_attributeDescriptions[role]
  }

  v2GraphPlaces.forEach(v2Place => {
    const v3Place = v3PlaceFromV2Place[v2Place]
    const axisClass = v2Component.componentStorage[`${v2Place}AxisClass`]
    const hasBounds = isV2PlaceWithBounds(v2Place)
    const lowerBound = hasBounds ? v2Component.componentStorage[`${v2Place}LowerBound`] : undefined
    const upperBound = hasBounds ? v2Component.componentStorage[`${v2Place}UpperBound`] : undefined
    if (v3Place && requiresAxisForV3Place(v3Place, axisClass)) {
      switch (axisClass) {
        case "DG.CellAxisModel":
          axes[v3Place] = {place: v3Place, type: "categorical"}
          break
        case "DG.BinnedAxisModel":
        case "DG.CellLinearAxisModel":
        case "DG.CountAxisModel":
        case "DG.FormulaAxisModel": {
          const type = ["DG.CountAxisModel", "DG.FormulaAxisModel"].includes(axisClass) ? "count" : "numeric"
          // TODO_V2_IMPORT [Story:#188701144] when lowerBound or upperBound are undefined or null this is
          // not handled correctly. It likely will cause an MST exception and failure to load.
          // There are 966 instances of `xUpperBound: null` in cfm-shared
          axes[v3Place] = {place: v3Place, type, min: lowerBound as any, max: upperBound as any}
          break
        }
      }
    }
  })
  // use empty axes for left/bottom if there are no other axes there
  ;(["bottom", "left"] as const).forEach(place => {
    if (!axes[place]) axes[place] = {place, type: "empty"}
  })

  // configure plot
  const primaryPlot = plotModels[0]
  const plot = v2PlotImporter(primaryPlot)

  // configure adornmentsStore
  const adornmentImporterProps = {
    data, metadata, plotModels,
    attributeDescriptions: _attributeDescriptions,
    yAttributeDescriptions: _yAttributeDescriptions
  }
  const adornmentsStore = v2AdornmentImporter(adornmentImporterProps)

  const content: IGraphContentModelSnapshot = {
    type: kGraphTileType,
    adornmentsStore,
    axes,
    plot,
    plotBackgroundColor,
    plotBackgroundOpacity,
    // plotBackgroundImage,
    // V2 plotBackgroundImageLockInfo can be null, V3 only accepts undefined
    plotBackgroundImageLockInfo: plotBackgroundImageLockInfo ?? undefined,
    isTransparent: isTransparent ?? false,
    /*
    * displayOnlySelected,legendRole, legendAttributeType, numberOfLegendQuantiles, legendQuantilesAreLocked,
    * */
    pointDescription: {
      _itemColors: pointColor ? [parseColorToHex(pointColor, {colorNames: true, alpha: transparency})] : [],
      _itemStrokeColor: strokeColor ? parseColorToHex(strokeColor, {colorNames: true, alpha: strokeTransparency})
                                    : strokeColor,
      _pointSizeMultiplier: pointSizeMultiplier,
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

  const graphTileSnap: ITileModelSnapshotIn =
      { id: toV3Id(kGraphIdPrefix, guid), name, _title: title, content, cannotClose }
  const graphTile = insertTile(graphTileSnap)

  // link shared model
  if (sharedModelManager && graphTile) {
    data && sharedModelManager.addTileSharedModel(graphTile.content, data, false)
    metadata && sharedModelManager.addTileSharedModel(graphTile.content, metadata, false)
  }

  return graphTile
}
