import { IAttribute } from "../../models/data/attribute"
import { isAttributeType } from "../../models/data/attribute-types"
import { ICollectionModel } from "../../models/data/collection"
import { IDataSet } from "../../models/data/data-set"
import { IAddCollectionOptions } from "../../models/data/data-set-types"
import { v2NameTitleToV3Title } from "../../models/data/v2-model"
import { IDataSetMetadata, isNonEmptyCollectionLabels } from "../../models/shared/data-set-metadata"
import { getMetadataFromDataSet } from "../../models/shared/shared-data-utils"
import { hasOwnProperty } from "../../utilities/js-utils"
import { isFiniteNumber } from "../../utilities/math-utils"
import { CodapV2ColorMap } from "../../v2/codap-v2-data-context-types"
import { DIAttribute, DICollection } from "../data-interactive-data-set-types"
import { convertValuesToAttributeSnapshot } from "../data-interactive-type-utils"

function applyColormap(attributeId: string, colormap: CodapV2ColorMap, metadata?: IDataSetMetadata) {
  if (metadata) {
    const categorySet = metadata.getCategorySet(attributeId)
    Object.entries(colormap).forEach(([category, color]) => {
      const _color = (typeof color === "string") ? color : color.colorString
      categorySet?.setColorForCategory(category, _color)
    })
  }
}

export function createAttribute(value: DIAttribute, dataContext: IDataSet, collection?: ICollectionModel,
                                metadata?: IDataSetMetadata) {
  const attributeSnapshot = convertValuesToAttributeSnapshot(value)
  if (attributeSnapshot) {
    const attribute = dataContext.addAttribute(attributeSnapshot, { collection: collection?.id })
    if (value.formula) attribute.formula?.setDisplayExpression(value.formula)
    metadata?.setIsHidden(attribute.id, !!value.hidden)
    if (value.colormap) {
      applyColormap(attribute.id, value.colormap, metadata)
    }
    return attribute
  }
}

export function createCollection(v2collection: DICollection, data: IDataSet, metadata: IDataSetMetadata) {
  // TODO How should we handle duplicate names?
  // TODO How should we handle missing names?
  const { attrs, cid, labels, name: collectionName,
    title: collectionTitle, defaults } = v2collection
  const _title = v2NameTitleToV3Title(collectionName ?? "", collectionTitle)
  const options: IAddCollectionOptions = { after: data.childCollection?.id }
  const collection = data.addCollection({ id: cid, name: collectionName, _title }, options)

  if (isNonEmptyCollectionLabels(labels)) {
    metadata.setCollectionLabels(collection.id, labels)
  }
  if (defaults) {
    metadata.setCollectionDefaults(collection.id, defaults)
  }

  attrs?.forEach(attr => {
    createAttribute(attr, data, collection, metadata)
  })

  return collection
}

export function updateAttribute(attribute: IAttribute, value: DIAttribute, dataContext?: IDataSet) {
  const metadata = dataContext ? getMetadataFromDataSet(dataContext) : undefined

  if (value?.cid != null) attribute.setCid(value.cid)
  if (value?.deleteProtected != null || value?.deleteable != null) {
    metadata?.setIsDeleteProtected(attribute.id, value.deleteProtected ?? !value.deleteable)
  }
  if (value?.renameProtected != null || value?.renameable != null) {
    metadata?.setIsRenameProtected(attribute.id, value.renameProtected ?? !value.renameable)
  }
  if (value?.description != null) attribute.setDescription(value.description)
  if (value?.editable != null) {
    metadata?.setIsEditProtected(attribute.id, !!value.editable)
  }
  if (value?.formula != null) attribute.setDisplayExpression(value.formula)
  if (value?.name != null) dataContext?.setAttributeName(attribute.id, value.name)
  if (hasOwnProperty(value, "precision")) {
    if (value.precision == null || value.precision === "") {
      attribute.setPrecision(undefined)
    } else {
      const numPrecision = +value.precision
      attribute.setPrecision(isFiniteNumber(numPrecision) ? numPrecision : undefined)
    }
  }
  if (value?.title != null) attribute.setTitle(value.title)
  if (isAttributeType(value?.type)) attribute.setUserType(value.type)
  if (value?.unit != null) attribute.setUnits(value.unit)
  if (value?.hidden != null) {
    metadata?.setIsHidden(attribute.id, value.hidden)
  }
  if (value?.colormap != null) {
    applyColormap(attribute.id, value.colormap, metadata)
  }
}
