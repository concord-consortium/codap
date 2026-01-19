import { IAttribute } from "../data/attribute"
import { IDataSet } from "../data/data-set"
// eslint-disable-next-line import-x/no-cycle
import { DGDataContextAPI } from "./dg-data-context-api"
import { SCObject } from "../../v2/sc-compat"

export class DGAttribute extends SCObject {
  static TYPE_UNSPECIFIED = 'none'
  static TYPE_NOMINAL = 'nominal' // no longer used
  static TYPE_CATEGORICAL = 'categorical'
  static TYPE_NUMERIC = 'numeric'
  static TYPE_DATE = 'date'
  static TYPE_QUALITATIVE = 'qualitative'
  static TYPE_BOUNDARY = 'boundary'
  static TYPE_CHECKBOX = 'checkbox'

  static attributeTypes = [
    DGAttribute.TYPE_UNSPECIFIED,
    DGAttribute.TYPE_CATEGORICAL,
    DGAttribute.TYPE_NUMERIC,
    DGAttribute.TYPE_DATE,
    DGAttribute.TYPE_QUALITATIVE,
    DGAttribute.TYPE_BOUNDARY,
    DGAttribute.TYPE_CHECKBOX
  ]

  constructor(readonly data: IDataSet, readonly attribute: IAttribute, readonly api: DGDataContextAPI) {
    super()
  }

  get(prop: string) {
    let result = super.get(prop) ?? (this.attribute as any)[prop]
    if (result == null && prop === "unit") {
      result = super.get("units") ?? this.attribute.units
    }
    return result
  }

  get collection() {
    return this.api.getCollectionForAttribute(this.attribute.id)
  }

  get formula() {
    return this.attribute.formula?.display
  }

  get hasFormula() {
    return this.attribute.hasFormula
  }

  hasDeletedFormula() {
    return false
  }

  get hidden() {
    // TODO: retrieve from case metadata
    return false
  }
}
