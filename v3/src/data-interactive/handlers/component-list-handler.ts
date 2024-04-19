import { isWebViewModel } from "../../components/web-view/web-view-model"
import { appState } from "../../models/app-state"
import { kComponentTypeV3ToV2Map, kV2GameType, kV2WebViewType } from "../data-interactive-component-types"
import { registerDIHandler } from "../data-interactive-handler"
import { DIComponentInfo, DIHandler, DIResources } from "../data-interactive-types"

export const diComponentListHandler: DIHandler = {
  get(_resources: DIResources) {
    const values: DIComponentInfo[] = []
    appState.document.content?.tileMap.forEach(tile => {
      // TODO Should we add names to tiles?
      // TODO Tiles sometimes show titles different than tile.title. Should we return those?
      const { content, id, title } = tile
      const type = isWebViewModel(content) ?
        content.isPlugin ?
          kV2GameType :
          kV2WebViewType :
        kComponentTypeV3ToV2Map[content.type]
      values.push({ id, title, type })
    })

    return { success: true, values }
  }
}

registerDIHandler("componentList", diComponentListHandler)
