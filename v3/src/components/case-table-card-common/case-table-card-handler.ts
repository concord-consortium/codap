import { V2CaseTable } from "../../data-interactive/data-interactive-component-types"
import { CreateOrShowTileFn, DIComponentHandler } from "../../data-interactive/handlers/component-handler"
import { errorResult } from "../../data-interactive/handlers/di-results"
import { appState } from "../../models/app-state"
import {
  getDataSetByNameOrId, getSharedCaseMetadataFromDataset, getSharedDataSetFromDataSetId
} from "../../models/shared/shared-data-utils"
import { t } from "../../utilities/translation/translate"
import { kCaseCardTileType, kV2CaseCardType } from "../case-card/case-card-defs"
import { isCaseCardModel } from "../case-card/case-card-model"
import { kCaseTableTileType } from "../case-table/case-table-defs"
import { isCaseTableModel } from "../case-table/case-table-model"
import { createOrShowTableOrCardForDataset } from "./case-table-card-utils"

export const caseTableCardComponentHandler: DIComponentHandler = {
  create({ type, values }) {
    const { document } = appState
    const { dataContext, horizontalScrollOffset } = values as V2CaseTable
    const dataContextNotFound = errorResult(t("V3.DI.Error.fieldRequired", { vars: ["Create", type, "dataContext"] }))
    if (!dataContext) return dataContextNotFound
    const dataSet = getDataSetByNameOrId(document, dataContext)
    if (!dataSet) return dataContextNotFound
    const sharedDataSet = getSharedDataSetFromDataSetId(document, dataSet.id)
    if (!sharedDataSet) return dataContextNotFound
    const caseMetadata = getSharedCaseMetadataFromDataset(dataSet)
    if (!caseMetadata) {
      return errorResult(t("V3.DI.Error.caseMetadataNotFound", { vars: [dataContext] }))
    }

    const createOrShow: CreateOrShowTileFn = (tileType, options) => {
      if (tileType !== kCaseCardTileType && tileType !== kCaseTableTileType) return undefined
      return createOrShowTableOrCardForDataset(sharedDataSet, tileType, options)
    }

    // TODO Handle isIndexHidden
    const scrollOffset = horizontalScrollOffset != null ? { horizontalScrollOffset } : undefined
    return {
      content: { type: type === kV2CaseCardType ? kCaseCardTileType : kCaseTableTileType, ...scrollOffset },
      createOrShow
    }
  },
  get(content) {
    if (isCaseCardModel(content) || isCaseTableModel(content)) {
      const scrollOffset = isCaseTableModel(content)
                            ? { horizontalScrollOffset: content._horizontalScrollOffset }
                            : undefined
      return { dataContext: content.data?.name, ...scrollOffset }
    }
  },
  update(content, values) {
    if (isCaseTableModel(content)) {
      // TODO Handle isIndexHidden
      const { horizontalScrollOffset } = values as V2CaseTable
      if (horizontalScrollOffset != null) content.setHorizontalScrollOffset(horizontalScrollOffset)
    }
    return { success: true }
  }
}
