import { IAttribute } from "../../models/data/attribute"
import { createAttributesNotification, updateAttributesNotification } from "../../models/data/data-set-notifications"
import { getSharedCaseMetadataFromDataset } from "../../models/shared/shared-data-utils"
import { t } from "../../utilities/translation/translate"
import { registerDIHandler } from "../data-interactive-handler"
import { convertAttributeToV2, convertAttributeToV2FromResources } from "../data-interactive-type-utils"
import { DIAttribute, DIHandler, DIResources, DIValues } from "../data-interactive-types"
import { createAttribute, updateAttribute } from "./di-handler-utils"
import { attributeNotFoundResult, collectionNotFoundResult, dataContextNotFoundResult } from "./di-results"

export const diAttributeHandler: DIHandler = {
  create(resources: DIResources, _values?: DIValues) {
    const { dataContext, collection } = resources
    if (!dataContext) return dataContextNotFoundResult
    if (!collection) return collectionNotFoundResult
    const metadata = getSharedCaseMetadataFromDataset(dataContext)
    const values = _values as DIAttribute | DIAttribute[]

    // Wrap single attribute in array and bail if any new attributes are missing names
    const attributeValues = Array.isArray(values) ? values : [values]
    const attributeErrors = attributeValues.map(singleValue => {
      if (!singleValue?.name) {
        return {
          success: false,
          values: { error: t("V3.DI.Error.fieldRequired", { vars: ["Create", "attribute", "name"] }) }
        } as const
      }
      return { success: true }
    }).filter(error => !error.success)
    if (attributeErrors.length > 0) return attributeErrors[0]

    // Create the attributes
    const attributes: IAttribute[] = []
    dataContext.applyModelChange(() => {
      attributeValues.forEach(attributeValue => {
        // Check for existing attribute with same name
        if (attributeValue.name) {
          const oldAttribute = collection.getAttributeByName(attributeValue.name)
          if (oldAttribute) {
            updateAttribute(oldAttribute, attributeValue, dataContext)
            attributes.push(oldAttribute)
            return
          }
        }

        const attribute = createAttribute(attributeValue, dataContext, collection, metadata)
        if (attribute) attributes.push(attribute)
      })
    }, {
      notify: () => createAttributesNotification(attributes, dataContext)
    })
    return { success: true, values: {
      attrs: attributes.map(attribute => convertAttributeToV2(attribute, dataContext))
    } }
  },

  delete(resources: DIResources) {
    const { attribute, dataContext } = resources
    if (!attribute) return attributeNotFoundResult
    if (!dataContext) return dataContextNotFoundResult

    dataContext.applyModelChange(() => {
      dataContext.removeAttribute(attribute.id)
    })
    return { success: true }
  },

  get(resources: DIResources) {
    const attribute = convertAttributeToV2FromResources(resources)
    if (!attribute) return attributeNotFoundResult

    return {
      success: true,
      values: attribute
    }
  },

  update(resources: DIResources, _values?: DIValues) {
    const { attribute, dataContext } = resources
    if (!attribute || Array.isArray(_values)) return attributeNotFoundResult

    const values = _values as DIAttribute
    attribute.applyModelChange(() => {
      updateAttribute(attribute, values, dataContext)
    }, {
      notify: () => updateAttributesNotification([attribute], dataContext)
    })

    const attributeV2 = convertAttributeToV2FromResources(resources)
    if (!attributeV2) return attributeNotFoundResult

    return {
      success: true,
      values: {
        attrs: [
          attributeV2
        ]
      }
    }
  }
}

registerDIHandler("attribute", diAttributeHandler)
