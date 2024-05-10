import { isWebViewModel } from "../../components/web-view/web-view-model"
import { appState } from "../../models/app-state"
import { isFreeTileLayout } from "../../models/document/free-tile-row"
import { toV2Id } from "../../utilities/codap-utils"
import { kComponentTypeV3ToV2Map, kV2GameType, kV2WebViewType } from "../data-interactive-component-types"
import { registerDIHandler } from "../data-interactive-handler"
import { DIComponentInfo, DIHandler, DIResources } from "../data-interactive-types"

export const diComponentListHandler: DIHandler = {
  get(_resources: DIResources) {
    const { document } = appState
    const values: DIComponentInfo[] = []
    document.content?.tileMap.forEach(tile => {
      // TODO Should we add names to tiles?
      // TODO Tiles sometimes show titles different than tile.title. Should we return those?
      const { content, id, title } = tile
      const type = isWebViewModel(content)
        ? content.isPlugin
          ? kV2GameType
          : kV2WebViewType
        : kComponentTypeV3ToV2Map[content.type]
      const tileLayout = document.content?.getTileLayoutById(id)
      const hidden = isFreeTileLayout(tileLayout) ? !!tileLayout.isHidden : false
      values.push({ hidden, id: toV2Id(id), title, type })
    })

    return { success: true, values }
  }
}

registerDIHandler("componentList", diComponentListHandler)
