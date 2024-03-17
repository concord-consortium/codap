import { IAttribute, IAttributeSnapshot, isAttributeType } from "../../models/data/attribute"
import { IDataSet } from "../../models/data/data-set"
import { withoutUndo } from "../../models/history/without-undo"
import { getSharedCaseMetadataFromDataset } from "../../models/shared/shared-data-utils"
import { t } from "../../utilities/translation/translate"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources, DISingleValues, DIValues } from "../data-interactive-types"

function convertAttributeToV2(attribute: IAttribute, dataContext?: IDataSet) {
  const metadata = dataContext && getSharedCaseMetadataFromDataset(dataContext)
  const { name, type, title, description, editable, id, precision } = attribute
  return {
    name,
    type,
    title,
    cid: id,
    // defaultMin: self.defaultMin, // TODO Where should this come from?
    // defaultMax: self.defaultMax, // TODO Where should this come from?
    description,
    // _categoryMap: self.categoryMap, // TODO What is this?
    // blockDisplayOfEmptyCategories: self.blockDisplayOfEmptyCategories, // TODO What?
    editable,
    hidden: (attribute && metadata?.hidden.get(attribute.id)) ?? false,
    renameable: true, // TODO What should this be?
    deleteable: true, // TODO What should this be?
    formula: attribute.formula?.display,
    // deletedFormula: self.deletedFormula, // TODO What should this be?
    guid: Number(id), // TODO This is different than v2
    id: Number(id), // TODO This is different than v2
    precision,
    unit: attribute.units
  }
}

function convertValuesToAttributeSnapshot(values: DISingleValues): IAttributeSnapshot | undefined {
  if (values.name) {
    const userType = values.type && isAttributeType(values.type) ? values.type : undefined
    return {
      name: values.name,
      userType,
      title: values.title,
      id: values.cid, // TODO Should we allow the values to specify an id at all?
      // defaultMin: values.defaultMin, // TODO defaultMin not a part of IAttribute yet
      // defaultMax: values.defaultMax, // TODO defaultMax not a part of IAttribute yet
      description: values.description,
      // categoryMap: values._categoryMap, // TODO categoryMap not part of IAttribute. Should it be?
      // blockDisplayOfEmptyCategories: values.blockDisplayOfEmptyCategories, // TODO Not part of IAttribute yet
      editable: values.editable,
      // hidden is part of metadata, not the attribute model
      // renameable: values.renameable, // TODO renameable not part of IAttribute yet
      // deleteable: values.deleteable, // TODO deleteable not part of IAttribute yet
      // formula is not part of the attribute model so it's handled separately
      // deletedFormula: values.deletedFormula, // TODO deletedFormula not part of IAttribute. Should it be?
      // guid is not in the attribute model
      // id has no equivalent part of the attribute model
      precision: values.precision,
      units: values.unit
    }
  }
}

function convertAttributeToV2FromResources(resources: DIResources) {
  const { attribute, dataContext } = resources
  if (attribute) {
    return convertAttributeToV2(attribute, dataContext)
  }
}

const attributeNotFoundResult = { success: false, values: { error: t("V3.DI.Error.attributeNotFound") } } as const
const dataContextNotFoundResult = { success: false, values: { error: t("V3.DI.Error.dataContextNotFound") } } as const
export const diAttributeHandler: DIHandler = {
  get(resources: DIResources) {
    const attribute = convertAttributeToV2FromResources(resources)
    if (attribute) {
      return {
        success: true,
        values: attribute
      }
    }
    return attributeNotFoundResult
  },
  create(resources: DIResources, values?: DIValues) {
    const { dataContext } = resources
    if (!dataContext) return dataContextNotFoundResult
    const metadata = getSharedCaseMetadataFromDataset(dataContext)

    // Wrap single attribute in array and bail if any new attributes are missing names
    const attributeValues = Array.isArray(values) ? values : [values]
    const attributeErrors = attributeValues.map(singleValue => {
      if (!singleValue?.name) {
        return { success: false, values: { error: t("V3.DI.Error.fieldRequired", { vars: ["Create", "attribute", "name"] }) } } as const
      }
      return { success: true }
    }).filter(error => !error.success)
    if (attributeErrors.length > 0) return attributeErrors[0]

    // Create the attributes
    const attributes: IAttribute[] = []
    const createAttribute = (value: DISingleValues) => {
      dataContext.applyUndoableAction(() => {
        withoutUndo()
        const attributeSnapshot = convertValuesToAttributeSnapshot(value)
        if (attributeSnapshot) {
          const attribute = dataContext.addAttribute(attributeSnapshot)
          if (value.formula) attribute.formula?.setDisplayExpression(value.formula)
          metadata?.hidden.set(attribute.id, !!value.hidden)
          attributes.push(attribute)
        }
      }, "", "")
    }
    attributeValues.forEach(attributeValue => {
      if (attributeValue) createAttribute(attributeValue)
    })
    return { success: true, values: {
      attrs: attributes.map(attribute => convertAttributeToV2(attribute, dataContext))
    } }
  },
  update(resources: DIResources, values?: DIValues) {
    const { attribute } = resources
    if (!attribute || Array.isArray(values)) return attributeNotFoundResult

    attribute.applyUndoableAction(() => {
      withoutUndo()
      if (values?.description != null) attribute.setDescription(values.description)
      if (values?.editable != null) attribute.setEditable(values.editable)
      if (values?.formula != null) attribute.setDisplayExpression(values.formula)
      if (values?.name != null) attribute.setName(values.name)
      if (values?.precision != null) attribute.setPrecision(values.precision)
      if (values?.title != null) attribute.setTitle(values.title)
      if (values?.type && isAttributeType(values.type)) attribute.setUserType(values.type)
      if (values?.unit != null) attribute.setUnits(values.unit)
      if (values?.hidden != null) {
        const { dataContext } = resources
        if (dataContext) {
          const metadata = getSharedCaseMetadataFromDataset(dataContext)
          metadata?.hidden.set(attribute.id, values.hidden)
        }
      }
    }, "", "")
    const attributeV2 = convertAttributeToV2FromResources(resources)
    if (attributeV2) {
      return {
        success: true,
        values: {
          attrs: [
            attributeV2
          ]
        }
      }
    }
    return attributeNotFoundResult
  },
  delete(resources: DIResources) {
    const { attribute, dataContext } = resources
    if (!attribute) return attributeNotFoundResult
    if (!dataContext) return dataContextNotFoundResult

    dataContext.applyUndoableAction(() => {
      withoutUndo()
      dataContext.removeAttribute(attribute.id)
    }, "", "")
    return { success: true }
  }
}

registerDIHandler("attribute", diAttributeHandler)
