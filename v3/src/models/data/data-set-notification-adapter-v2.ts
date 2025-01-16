import { convertAttributeToV2, convertCaseToV2FullCase } from "../../data-interactive/data-interactive-type-utils"
import { IDataSetNotificationAdapter } from "./data-set-notification-adapter"

export const V2DataSetNotificationAdapter: IDataSetNotificationAdapter = {
  convertAttribute(attr, dataset) {
    return convertAttributeToV2(attr, dataset)
  },
  convertCase(_case, dataset) {
    return convertCaseToV2FullCase(_case, dataset)
  }
}
