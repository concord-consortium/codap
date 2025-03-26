import { IAttribute } from "../../models/data/attribute"
import { isAttributeType } from "../../models/data/attribute-types"
import { TCategoryColorMap } from "../../models/data/category-set"
import { ICollectionModel } from "../../models/data/collection"
import { IDataSet } from "../../models/data/data-set"
import { IAddCollectionOptions } from "../../models/data/data-set-types"
import { v2NameTitleToV3Title } from "../../models/data/v2-model"
import { ISharedCaseMetadata } from "../../models/shared/shared-case-metadata"
import { getSharedCaseMetadataFromDataset } from "../../models/shared/shared-data-utils"
import { hasOwnProperty } from "../../utilities/js-utils"
import { DIAttribute, DICollection } from "../data-interactive-data-set-types"
import { convertValuesToAttributeSnapshot } from "../data-interactive-type-utils"

function applyColormap(attributeId: string, colormap: TCategoryColorMap, metadata?: ISharedCaseMetadata) {
  if (metadata) {
    const categorySet = metadata.getCategorySet(attributeId)
    Object.entries(colormap).forEach(([category, color]) => {
      categorySet?.setColorForCategory(category, color)
    })
  }
}

export function createAttribute(value: DIAttribute, dataContext: IDataSet, collection?: ICollectionModel,
                                metadata?: ISharedCaseMetadata) {
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

export function createCollection(v2collection: DICollection, dataContext: IDataSet, metadata?: ISharedCaseMetadata) {
  // TODO How should we handle duplicate names?
  // TODO How should we handle missing names?
  const { attrs, cid, labels, name: collectionName, title: collectionTitle } = v2collection
  const _title = v2NameTitleToV3Title(collectionName ?? "", collectionTitle)
  const options: IAddCollectionOptions = { after: dataContext.childCollection?.id }
  const collection = dataContext.addCollection({ id: cid, labels, name: collectionName, _title }, options)

  attrs?.forEach(attr => {
    createAttribute(attr, dataContext, collection, metadata)
  })

  return collection
}

export function updateAttribute(attribute: IAttribute, value: DIAttribute, dataContext?: IDataSet) {
  const metadata = dataContext ? getSharedCaseMetadataFromDataset(dataContext) : undefined

  if (value?.cid != null) attribute.setCid(value.cid)
  if (value?.deleteable != null) attribute.setDeleteable(value.deleteable)
  if (value?.description != null) attribute.setDescription(value.description)
  if (value?.editable != null) attribute.setEditable(!!value.editable)
  if (value?.formula != null) attribute.setDisplayExpression(value.formula)
  if (value?.name != null) dataContext?.setAttributeName(attribute.id, value.name)
  if (hasOwnProperty(value, "precision")) {
    attribute.setPrecision(value.precision == null || value.precision === "" ? undefined : +value.precision)
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
