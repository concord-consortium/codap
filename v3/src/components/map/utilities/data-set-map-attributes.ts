import { ICollectionModel } from "../../../models/data/collection"
import { IDataSet } from "../../../models/data/data-set"
import { kLatNames, kLongNames, kPinLatNames, kPinLongNames } from "../map-types"
import { IMapLayerModel } from "../models/map-layer-model"
import { isMapPinLayerModel } from "../models/map-pin-layer-model"
import { isMapPolygonLayerModel } from "../models/map-polygon-layer-model"
import { isMapPointLayerModel } from "../models/map-point-layer-model"
import { isBoundaryAttribute } from "./map-utils"

interface IMapAttributesBase {
  isAssigned?: boolean
}

interface IBoundaryAttribute extends IMapAttributesBase {
  attrId: string
}

interface ILatLongAttributes extends IMapAttributesBase {
  latAttrId?: string
  longAttrId?: string
}

export interface ICollectionMapAttributes {
  boundaries?: IBoundaryAttribute
  points?: ILatLongAttributes
  pins?: ILatLongAttributes
}

export function getMapAttributesForCollection(collection: ICollectionModel): Maybe<ICollectionMapAttributes> {
  const mapAttributes: ICollectionMapAttributes = {}
  let hasMapAttributes = false
  collection.attributes.forEach(attr => {
    if (!attr) return
    const attrName = attr.name.toLowerCase()
    if (isBoundaryAttribute(attr)) {
      mapAttributes.boundaries = { attrId: attr.id }
      hasMapAttributes = true
    }
    else if (kLatNames.includes(attrName)) {
      mapAttributes.points = { ...mapAttributes.points, latAttrId: attr.id }
      hasMapAttributes = true
    }
    else if (kLongNames.includes(attrName)) {
      mapAttributes.points = { ...mapAttributes.points, longAttrId: attr.id }
      hasMapAttributes = true
    }
    else if (kPinLatNames.includes(attrName)) {
      mapAttributes.pins = { ...mapAttributes.pins, latAttrId: attr.id }
      hasMapAttributes = true
    }
    else if (kPinLongNames.includes(attrName)) {
      mapAttributes.pins = { ...mapAttributes.pins, longAttrId: attr.id }
      hasMapAttributes = true
    }
  })
  return hasMapAttributes ? mapAttributes : undefined
}

export function getMapAttributesForDataSet(dataSet: IDataSet): ICollectionMapAttributes[] {
  const geoAttributesList = dataSet.collections.map(collection => getMapAttributesForCollection(collection))
  return geoAttributesList.filter(geoAttrs => !!geoAttrs)
}

export class DataSetMapAttributes {
  dataSet: IDataSet
  collections: ICollectionMapAttributes[] = []

  constructor(dataSet: IDataSet) {
    this.dataSet = dataSet
    this.collections = getMapAttributesForDataSet(dataSet)
  }

  get hasMapAttributes() {
    return this.collections.length > 0
  }

  get hasUnassignedMapAttributes() {
    return this.hasUnassignedBoundaryAttributes ||
           this.hasUnassignedPointAttributes ||
           this.hasUnassignedPinAttributes
  }

  get hasUnassignedBoundaryAttributes() {
    return this.collections.some(({ boundaries }) => boundaries?.attrId && !boundaries.isAssigned)
  }

  assignFirstUnassignedBoundaryAttribute() {
    const geoAttrs = this.collections.find(({ boundaries }) => boundaries?.attrId && !boundaries.isAssigned)
    if (geoAttrs?.boundaries) {
      geoAttrs.boundaries.isAssigned = true
      return geoAttrs.boundaries.attrId
    }
  }

  get hasUnassignedPointAttributes() {
    return this.collections.some(({ points }) => points?.latAttrId && points?.longAttrId && !points.isAssigned)
  }

  assignFirstUnassignedPointAttributes() {
    const geoAttrs = this.collections.find(({ points: p }) => p?.latAttrId && p?.longAttrId && !p.isAssigned)
    if (geoAttrs?.points) {
      geoAttrs.points.isAssigned = true
      return {
        latId: geoAttrs.points.latAttrId!,
        longId: geoAttrs.points.longAttrId!
      }
    }
  }

  get hasUnassignedPinAttributes() {
    return this.collections.some(({ pins }) => pins?.latAttrId && pins?.longAttrId && !pins.isAssigned)
  }

  assignFirstUnassignedPinAttributes() {
    const geoAttrs = this.collections.find(({ pins }) => pins?.latAttrId && pins?.longAttrId && !pins.isAssigned)
    if (geoAttrs?.pins) {
      geoAttrs.pins.isAssigned = true
      return {
        latId: geoAttrs.pins.latAttrId!,
        longId: geoAttrs.pins.longAttrId!
      }
    }
  }

  matchMapLayer(layer: IMapLayerModel) {
    const layerDataSetId = layer.dataConfiguration.dataset?.id
    if (layerDataSetId != null && layerDataSetId !== this.dataSet.id) {
      return false
    }
    if (isMapPolygonLayerModel(layer)) {
      const polygonAttrId = layer.dataConfiguration.attributeDescriptionForRole("polygon")?.attributeID
      if (polygonAttrId) {
        const match = this.collections.find(({ boundaries }) => {
          if (boundaries?.attrId === polygonAttrId && !boundaries.isAssigned) {
            boundaries.isAssigned = true
            return true
          }
        })
        return !!match
      }
      // layer has no polygon attribute; assign one if there's one available
      const boundaryAttribute = this.assignFirstUnassignedBoundaryAttribute()
      if (boundaryAttribute) {
        layer.setBoundaryAttribute(this.dataSet, boundaryAttribute)
        return true
      }
    }
    if (isMapPointLayerModel(layer)) {
      const { latId, longId } = layer.pointAttributes || {}
      if (latId && longId) {
        const match = this.collections.find(({ points }) => {
          if (points?.latAttrId === latId && points?.longAttrId === longId && !points.isAssigned) {
            points.isAssigned = true
            return true
          }
        })
        return !!match
      }
      // layer has no lat/long attributes; assign ones if available
      const pointAttrs = this.assignFirstUnassignedPointAttributes()
      if (pointAttrs) {
        layer.setPointAttributes(this.dataSet, pointAttrs.latId, pointAttrs.longId)
        return true
      }
    }
    if (isMapPinLayerModel(layer)) {
      const { latId, longId } = layer.pinAttributes || {}
      if (latId && longId) {
        const match = this.collections.find(({ pins }) => {
          if (pins?.latAttrId === latId && pins?.longAttrId === longId && !pins.isAssigned) {
            pins.isAssigned = true
            return true
          }
        })
        return !!match
      }
      // layer has no pin lat/long attributes; assign ones if available
      const pinAttrs = this.assignFirstUnassignedPinAttributes()
      if (pinAttrs) {
        layer.setPinAttributes(this.dataSet, pinAttrs.latId, pinAttrs.longId)
        return true
      }
    }
    return false
  }
}
