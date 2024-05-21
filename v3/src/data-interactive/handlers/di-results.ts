import { t } from "../../utilities/translation/translate"

export const caseNotFoundResult =
  { success: false, values: { error: t("V3.DI.Error.caseNotFound") } } as const
export const dataContextNotFoundResult =
  { success: false, values: { error: t("V3.DI.Error.dataContextNotFound") } } as const
