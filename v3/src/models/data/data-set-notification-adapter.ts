import { IAttribute } from "./attribute"
import { IDataSet } from "./data-set"
import { ICase } from "./data-set-types"

export interface IDataSetNotificationAdapter {
  convertAttribute: (attr: IAttribute, dataset?: IDataSet) => any;
  convertCase: (_case: ICase, dataset: IDataSet) => any
}

let gDataSetNotificationAdapter: IDataSetNotificationAdapter = {
  convertAttribute(attr, dataset) { return attr },
  convertCase(_case, dataset) { return _case }
}

export function setDataSetNotificationAdapter(adapter: IDataSetNotificationAdapter) {
  gDataSetNotificationAdapter = adapter
}

export function getDataSetNotificationAdapter() {
  return gDataSetNotificationAdapter
}
