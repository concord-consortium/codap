import { t } from "../../utilities/translation/translate"

export const errorResult = (error: string) => ({ success: false as const, values: { error } })
export type DIErrorResult = ReturnType<typeof errorResult>

export const adornmentNotFoundResult = errorResult(t("V3.DI.Error.adornmentNotFound"))
export const adornmentListNotFoundResult = errorResult(t("V3.DI.Error.adornmentListNotFound"))
export const adornmentNotSupportedResult = errorResult(t("V3.DI.Error.adornmentNotSupported"))
export const adornmentNotSupportedByPlotTypeResult = errorResult(t("V3.DI.Error.adornmentNotSupportedByPlotType"))
export const attributeNotFoundResult = errorResult(t("V3.DI.Error.attributeNotFound"))
export const caseNotFoundResult = errorResult(t("V3.DI.Error.caseNotFound"))
export const collectionNotFoundResult = errorResult(t("V3.DI.Error.collectionNotFound"))
export const componentNotFoundResult = errorResult(t("V3.DI.Error.componentNotFound"))
export const couldNotParseQueryResult = errorResult(t("V3.DI.Error.couldNotParseQuery"))
export const dataContextNotFoundResult = errorResult(t("V3.DI.Error.dataContextNotFound"))
export const dataDisplayNotFoundResult = errorResult(t("V3.DI.Error.dataDisplayNotFound"))
export const invalidValuesProvidedResult = errorResult(t("V3.DI.Error.invalidValuesProvided"))
export const itemNotFoundResult = errorResult(t("V3.DI.Error.itemNotFound"))
export const noColorMapAccessResult = errorResult(t("V3.DI.Error.colorMapAccess"))
export const noInteractiveFrameResult = errorResult(t("V3.DI.Error.interactiveFrameNotFound"))
export const valuesRequiredResult = errorResult(t("V3.DI.Error.valuesRequired"))

export function fieldRequiredResult(action: string, resource: string, field: string) {
  return errorResult(t("V3.DI.Error.fieldRequired", { vars: [action, resource, field] }))
}
