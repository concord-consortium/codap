import { appState } from "../../models/app-state"
import { IAttribute } from "../../models/data/attribute"
import { createAttributesNotification, updateAttributesNotification } from "../../models/data/data-set-notifications"
import { IFreeTileLayout, isFreeTileRow } from "../../models/document/free-tile-row"
import { getSharedCaseMetadataFromDataset } from "../../models/shared/shared-data-utils"
import { uiState } from "../../models/ui-state"
import { t } from "../../utilities/translation/translate"
import { registerDIHandler } from "../data-interactive-handler"
import { convertAttributeToV2, convertAttributeToV2FromResources } from "../data-interactive-type-utils"
import { DIAttribute, DIHandler, DINotifyAttribute, DIResources, DIValues } from "../data-interactive-types"
import { createAttribute, updateAttribute } from "./di-handler-utils"
import {
  attributeNotFoundResult, collectionNotFoundResult, dataContextNotFoundResult, errorResult, fieldRequiredResult
} from "./di-results"

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
      if (!singleValue?.name) return fieldRequiredResult("Create", "attribute", "name")
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

  notify(resources: DIResources, values?: DIValues) {
    const { attribute, dataContext } = resources
    if (!dataContext) return dataContextNotFoundResult
    if (!attribute) return attributeNotFoundResult

    const { request } = (values ?? {}) as DINotifyAttribute
    if (!request) return fieldRequiredResult("Notify", "attribute", "request")

    if (request === "dragStart") {
      uiState.setDraggingDatasetId(dataContext.id)
      uiState.setDraggingAttributeId(attribute.id)
      const pluginAttributeDrag = document.getElementById("plugin-attribute-drag")
      if (pluginAttributeDrag) {
        // General properties of events
        const bubbles = true
        const cancelable = true
        // const isPrimary = true
        // const pointerId = Date.now()
        // const pointerType = "mouse"

        // Determine position of drag
        let height = 10
        let width = 10
        let x = 0
        let y = 0
        const { interactiveFrame } = resources
        const row = appState.document.content?.firstRow
        if (interactiveFrame && row && isFreeTileRow(row)) {
          const layout = (row.getTileLayout(interactiveFrame.id) ?? { x: 0, y: 0 }) as IFreeTileLayout
          height = layout.height ?? height
          width = layout.width ?? width
          x = layout.x
          y = layout.y
        }
        const clientX = x + (width / 2)
        const clientY = y + (height / 2)

        // Dispatch events that will trigger a drag start
        // A setTimeout is used to ensure that hooks are updated before the drag begins
        setTimeout(() => {
          // pluginAttributeDrag.dispatchEvent(new PointerEvent("pointerdown", {
          //   bubbles, cancelable, clientX, clientY, isPrimary, pointerId, pointerType
          // }))
          // document.dispatchEvent(new PointerEvent("pointermove", {
          //   bubbles, cancelable, clientX: clientX + 10, clientY: clientY + 10, isPrimary, pointerId, pointerType
          // }))
          pluginAttributeDrag.dispatchEvent(new MouseEvent("mousedown", {
            bubbles, cancelable, clientX, clientY
          }))
          document.dispatchEvent(new MouseEvent("mousemove", {
            bubbles, cancelable, clientX: clientX + 10, clientY: clientY + 10
          }))
        })
      }
      return { success: true }
    }

    return errorResult(t("V3.DI.Error.unknownRequest", { vars: [request] })) 
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
