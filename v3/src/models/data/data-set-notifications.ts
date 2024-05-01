import { debugLog, DEBUG_PLUGINS } from "../../lib/debug"
import { convertAttributeToV2, convertCaseToV2FullCase } from "../../data-interactive/data-interactive-type-utils"
import { IAttribute } from "./attribute"
import { IDataSet } from "./data-set"
import { ICase } from "./data-set-types"

function attributeNotification(
  operation: string, data?: IDataSet, attrIDs?: string[], attrs?: IAttribute[]
) {
  const action = "notify"
  const resource = `dataContextChangeNotice[${data?.name}]`
  const values = {
    operation,
    result: {
      success: true,
      attrs: attrs?.map(attr => convertAttributeToV2(attr, data)),
      attrIDs
    }
  }
  return { message: { action, resource, values }, callback: (response: any) =>
    debugLog(DEBUG_PLUGINS, `Reply to ${action} ${operation} ${attrIDs ?? ""}`, JSON.stringify(response))
  }
}

export function createAttributesNotification(attrs: IAttribute[], data?: IDataSet) {
  return attributeNotification("createAttributes", data, attrs.map(attr => attr.id), attrs)
}

export function hideAttributeNotification(attrIDs: string[], data?: IDataSet, operation: string = "hideAttributes") {
  return attributeNotification(operation, data, attrIDs)
}

export function moveAttributeNotification(data?: IDataSet) {
  return attributeNotification("moveAttribute", data)
}

export function removeAttributesNotification(attrIDs: string[], data?: IDataSet) {
  return attributeNotification("deleteAttributes", data, attrIDs)
}

export function updateAttributesNotification(attrs: IAttribute[], data?: IDataSet) {
  return attributeNotification("updateAttributes", data, attrs.map(attr => attr.id), attrs)
}

export function updateCasesNotification(data: IDataSet, cases?: ICase[]) {
  const action = "notify"
  const resource = `dataContextChangeNotice[${data.name}]`
  const operation = "updateCases"
  const caseIDs = cases?.map(c => c.__id__)
  const values = {
    operation,
    result: {
      success: true,
      caseIDs,
      cases: cases?.map(c => convertCaseToV2FullCase(c, data))
    }
  }
  return { message: { action, resource, values }, callback: (response: any) =>
    debugLog(DEBUG_PLUGINS, `Reply to ${action} ${operation}`, JSON.stringify(response))
  }
}
