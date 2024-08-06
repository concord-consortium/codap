import { appState } from "../../models/app-state"
import { isFreeTileLayout } from "../../models/document/free-tile-row"
import { getTileContentInfo } from "../../models/tiles/tile-content-info"
import { toV2Id } from "../../utilities/codap-utils"
import { kComponentTypeV3ToV2Map } from "../data-interactive-component-types"
import { registerDIHandler } from "../data-interactive-handler"
import { DIComponentInfo, DIHandler, DIResources } from "../data-interactive-types"

export const diComponentListHandler: DIHandler = {
  get(_resources: DIResources) {
    const { document } = appState
    const values: DIComponentInfo[] = []
    document.content?.tileMap.forEach(tile => {
      // TODO Tiles sometimes show titles different than tile.title. Should we return those?
      const { content, id, name: _name, _title: title } = tile
      const name = _name || undefined
      const contentInfo = getTileContentInfo(content.type)
      const type = contentInfo?.getV2Type?.(content) ?? kComponentTypeV3ToV2Map[content.type]
      const tileLayout = document.content?.getTileLayoutById(id)
      const hidden = isFreeTileLayout(tileLayout) ? !!tileLayout.isHidden : false
      values.push({ hidden, id: toV2Id(id), name, title, type })
    })

    return { success: true, values }
  }
}

registerDIHandler("componentList", diComponentListHandler)
