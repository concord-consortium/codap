import { ITileModel, ITileModelSnapshotIn } from "../../models/tiles/tile-model"
import {toV3AttrId, toV3Id} from "../../utilities/codap-utils"
import {defaultBackgroundColor, parseColorToHex} from "../../utilities/color-utils"
import {V2TileImportArgs} from "../../v2/codap-v2-tile-importers"
import { IGuidLink, isV2GraphComponent } from "../../v2/codap-v2-types"
import { importV3Properties } from "../../v2/codap-v2-type-utils"
import {v3TypeFromV2TypeIndex} from "../../v2/codap-v2-data-context-types"
import {GraphAttrRole, PrimaryAttrRole, axisPlaceToAttrRole} from "../data-display/data-display-types"
import { v2DataDisplayPostImportSnapshotProcessor } from "../data-display/v2-data-display-import-utils"
import {
  GraphAttributeDescriptionsMapSnapshot, IAttributeDescriptionSnapshot
} from "../data-display/models/data-configuration-model"
import {AxisPlace} from "../axis/axis-types"
import {IAxisModelSnapshotUnion} from "../axis/models/axis-model-union"
import {IAdornmentImporterProps, v2AdornmentImporter} from "./adornments/v2-adornment-importer"
import {kGraphIdPrefix, kGraphTileType} from "./graph-defs"
import { IGraphContentModelSnapshot } from "./models/graph-content-model"
import {kGraphDataConfigurationType} from "./models/graph-data-configuration-model"
import {kGraphPointLayerType} from "./models/graph-point-layer-model"
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

export function v2GraphImporter({v2Component, v2Document, getCaseData, insertTile, linkSharedModel}: V2TileImportArgs) {
  if (!isV2GraphComponent(v2Component)) return

  const {
    guid,

    componentStorage: {
      name, title, userSetTitle, _links_: links, plotModels, hiddenCases: _hiddenCaseIds, cannotClose,
      pointColor, transparency, strokeColor, strokeTransparency, pointSizeMultiplier,
      strokeSameAsFill, isTransparent, displayOnlySelected, enableMeasuresForSelection,
      enableNumberToggle, numberToggleLastMode,
      plotBackgroundImage, plotBackgroundImageLockInfo, numberOfLegendQuantiles, legendQuantilesAreLocked, v3
    }
  } = v2Component
  const plotBackgroundOpacity = v2Component.componentStorage.plotBackgroundOpacity ?? 1
  const plotBackgroundColor =
            (v2Component.componentStorage.plotBackgroundColor &&
                parseColorToHex(v2Component.componentStorage.plotBackgroundColor, {alpha: plotBackgroundOpacity})) ||
            defaultBackgroundColor
  type TLinksKey = keyof typeof links
  const contextId = links.context?.id
  const {sharedData, sharedMetadata} = contextId ? getCaseData(contextId) : {}

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
        v3AttrId = v2AttrId ? toV3AttrId(v2AttrId) : undefined,
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
          const type = axisClass === "DG.CountAxisModel"
                        ? "count"
                        : _attributeDescriptions[axisPlaceToAttrRole[v3Place]]?.type === "date"
                          ? "date"
                          : "numeric"
          // V2 lowerBound or upperBound can be undefined or null, which will cause an MST exception and
          // failure to load. So we assign a default value of lowerBound = 0 and upperBound = 10 if they are undefined.
          axes[v3Place] = {place: v3Place, type, min: lowerBound ?? 0, max: upperBound ?? 10}
          break
        }
      }
    }
  })
  // use empty axes for left/bottom if there are no other axes there
  ;(["bottom", "left"] as const).forEach(place => {
    if (!axes[place]) axes[place] = {place, type: "empty"}
  })

  const hiddenCaseIds = links.hiddenCases?.map(hiddenCase => hiddenCase.id) ?? []
  const combinedHiddenCaseIds = [...hiddenCaseIds, ...(_hiddenCaseIds ?? [])]
  const hiddenCases = combinedHiddenCaseIds.map(id => `CASE${id}`)
  // configure plot
  const primaryPlot = plotModels[0]
  const plot = v2PlotImporter(primaryPlot)

  // configure adornmentsStore
  const adornmentImporterProps: IAdornmentImporterProps = {
    data: sharedData, metadata: sharedMetadata, plotModels,
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
    // V2 plotBackgroundImage, plotBackgroundImageLockInfo & enableNumberToggle can be null, V3 only accepts undefined
    plotBackgroundImage: plotBackgroundImage ?? undefined,
    plotBackgroundImageLockInfo: plotBackgroundImageLockInfo ?? undefined,
    isTransparent: isTransparent ?? false,
    showParentToggles: enableNumberToggle ?? undefined,
    showOnlyLastCase: numberToggleLastMode,
    numberOfLegendQuantiles,
    legendQuantilesAreLocked,
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
        dataset: sharedData?.dataSet.id,
        metadata: sharedMetadata?.id,
        hiddenCases,
        primaryRole,
        _attributeDescriptions,
        _yAttributeDescriptions,
        displayOnlySelectedCases: displayOnlySelected,
        showMeasuresForSelection: enableMeasuresForSelection || undefined,
        ...importV3Properties(v3)
      }
    }]
  }

  const graphTileSnap: ITileModelSnapshotIn =
      { id: toV3Id(kGraphIdPrefix, guid), name, _title: title, userSetTitle, content, cannotClose }
  const graphTile = insertTile(graphTileSnap)

  // link shared model
  if (graphTile) {
    linkSharedModel(graphTile.content, sharedData, false)
    linkSharedModel(graphTile.content, sharedMetadata, false)
  }

  return graphTile
}

export function v2GraphPostImportSnapshotProcessor(
  tileModel: ITileModel, tileSnap: ITileModelSnapshotIn): ITileModelSnapshotIn
{
  if (tileSnap.content?.type !== "Graph") return tileSnap

  return v2DataDisplayPostImportSnapshotProcessor(tileModel, tileSnap)
}
