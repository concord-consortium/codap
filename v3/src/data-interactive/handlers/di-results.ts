import { t } from "../../utilities/translation/translate"

export const errorResult = (error: string) => ({ success: false as const, values: { error } })
export const attributeNotFoundResult = errorResult(t("V3.DI.Error.attributeNotFound"))
export const caseNotFoundResult = errorResult(t("V3.DI.Error.caseNotFound"))
export const collectionNotFoundResult = errorResult(t("V3.DI.Error.collectionNotFound"))
export const componentNotFoundResult = errorResult(t("V3.DI.Error.componentNotFound"))
export const couldNotParseQueryResult = errorResult(t("V3.DI.Error.couldNotParseQuery"))
export const dataContextNotFoundResult = errorResult(t("V3.DI.Error.dataContextNotFound"))
export const itemNotFoundResult = errorResult(t("V3.DI.Error.itemNotFound"))
export const valuesRequiredResult = errorResult(t("V3.DI.Error.valuesRequired"))
