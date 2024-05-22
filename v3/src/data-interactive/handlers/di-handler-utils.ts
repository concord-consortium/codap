import { CollectionModel, ICollectionPropsModel } from "../../models/data/collection"
import { IDataSet } from "../../models/data/data-set"
import { v2NameTitleToV3Title } from "../../models/data/v2-model"
import { ISharedCaseMetadata } from "../../models/shared/shared-case-metadata"
import { DIAttribute, DICollection } from "../data-interactive-types"
import { convertValuesToAttributeSnapshot } from "../data-interactive-type-utils"

export function createAttribute(
  value: DIAttribute, dataContext: IDataSet, metadata?: ISharedCaseMetadata, collection?: ICollectionPropsModel
) {
  const attributeSnapshot = convertValuesToAttributeSnapshot(value)
  if (attributeSnapshot) {
    const attribute = dataContext.addAttribute(attributeSnapshot, { collection: collection?.id })
    if (value.formula) attribute.formula?.setDisplayExpression(value.formula)
    metadata?.setIsHidden(attribute.id, !!value.hidden)
    return attribute
  }
}

export function createCollection(v2collection: DICollection, dataContext: IDataSet, metadata?: ISharedCaseMetadata) {
  // TODO How should we handle duplicate names?
  // TODO How should we handle missing names?
  // TODO Handle labels
  const { attrs, name: collectionName, title: collectionTitle } = v2collection
  const _title = v2NameTitleToV3Title(collectionName ?? "", collectionTitle)
  const collection = CollectionModel.create({ name: collectionName, _title })
  dataContext.addCollection(collection)

  attrs?.forEach(attr => {
    createAttribute(attr, dataContext, metadata, collection)
  })

  return collection
}
