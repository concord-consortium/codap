import { t } from "../../utilities/translation/translate"
import { registerDIHandler } from "../data-interactive-handler"
import { basicAttributeInfo } from "../data-interactive-type-utils"
import { DIHandler, DIResources } from "../data-interactive-types"

export const diAttributeListHandler: DIHandler = {
  get(resources: DIResources) {
    const { attributeList } = resources
    if (!attributeList) return { success: false, values: { error: t("V3.DI.Error.collectionNotFound") } }

    return {
      success: true,
      values: attributeList.map(attribute => basicAttributeInfo(attribute))
    }
  }
}

registerDIHandler("attributeList", diAttributeListHandler)
