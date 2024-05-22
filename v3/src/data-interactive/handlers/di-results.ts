import { t } from "../../utilities/translation/translate"

const errorResult = (error: string) => ({ success: false, values: { error } } as const)
export const attributeNotFoundResult = errorResult(t("V3.DI.Error.attributeNotFound"))
export const caseNotFoundResult = errorResult(t("V3.DI.Error.caseNotFound"))
export const collectionNotFoundResult = errorResult(t("V3.DI.Error.collectionNotFound"))
export const componentNotFoundResult = errorResult(t("V3.DI.Error.componentNotFound"))
export const dataContextNotFoundResult = errorResult(t("V3.DI.Error.dataContextNotFound"))
export const valuesRequiredResult = errorResult(t("V3.DI.Error.valuesRequired"))
