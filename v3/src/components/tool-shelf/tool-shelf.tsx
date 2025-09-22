import { Flex, Spacer } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import React from "react"
import { SetRequired } from "type-fest"
import { getRedoStringKey, getUndoStringKey } from "../../models/history/codap-undo-types"
import {
  getTileComponentInfo, getTileComponentKeys, ITileComponentInfo
} from "../../models/tiles/tile-component-info"
import RedoIcon from "../../assets/icons/icon-redo.svg"
import UndoIcon from "../../assets/icons/icon-undo.svg"
import TileListIcon from "../../assets/icons/icon-tile-list.svg"
import GuideIcon from "../../assets/icons/icon-guide.svg"
import { DEBUG_UNDO } from "../../lib/debug"
import { logMessageWithReplacement } from "../../lib/log-message"
import { IDocumentModel } from "../../models/document/document"
import { ITileModel } from "../../models/tiles/tile-model"
import { createTileNotification } from "../../models/tiles/tile-notifications"
import { t } from "../../utilities/translation/translate"
import { kWebViewTileType } from "../web-view/web-view-defs"
import { isWebViewModel } from "../web-view/web-view-model"
import { TilesListShelfButton } from "./tiles-list-button"
import { PluginsButton } from "./plugins-button"
import { ToolShelfButton, ToolShelfTileButton } from "./tool-shelf-button"
import { GuideButton} from "./guide-button"

import "./tool-shelf.scss"

// Type for components known to have shelf properties
type IShelfTileComponentInfo = SetRequired<ITileComponentInfo, "shelf">
export function isShelfTileComponent(info?: ITileComponentInfo): info is IShelfTileComponentInfo {
  return !!info && "shelf" in info && info.shelf != null
}

function hasGuideTile(document: IDocumentModel) {
  const tiles = document?.content?.getTilesOfType(kWebViewTileType) ?? []
  const guideTile = tiles.find(tile => isWebViewModel(tile.content) && tile.content.isGuide)
  return guideTile?.id ?? ''
}

interface IRightButtonEntry {
  className?: string
  icon: React.ReactElement
  labelKey: string
  hintKey: string
  button?: React.ReactElement
  isDisabled?: () => boolean
  onClick?: () => void
}

interface IProps {
  document: IDocumentModel
}
export const ToolShelf = observer(function ToolShelf({ document }: IProps) {
  const undoManager = document?.treeManagerAPI?.undoManager
  const guideTileId = hasGuideTile(document)
  const rightButtons: IRightButtonEntry[] = [
    {
      className: "undo-button",
      icon: <UndoIcon className="icon-undo"/>,
      labelKey: "DG.mainPage.mainPane.undoButton.title",
      hintKey: getUndoStringKey(undoManager),
      isDisabled: () => !document?.canUndo,
      onClick: () => {
        if (document?.canUndo) {
          document?.undoLastAction()
        }
      }
    },
    {
      className: "redo-button",
      icon: <RedoIcon className="icon-redo"/>,
      labelKey: "DG.mainPage.mainPane.redoButton.title",
      hintKey: getRedoStringKey(undoManager),
      isDisabled: () => !document?.canRedo,
      onClick: () => {
        if (document?.canRedo) {
          document.redoLastAction()
        }
      }
    },
    {
      icon: <TileListIcon className="icon-tile-list"/>,
      labelKey: "DG.ToolButtonData.tileListMenu.title",
      hintKey: "DG.ToolButtonData.tileListMenu.toolTip",
      button: <TilesListShelfButton key={t("DG.ToolButtonData.tileListMenu.title")} />
    },
    // only show the guide button if there is a guide tile in the document
    ...(
      guideTileId
        ? [{
          icon: <GuideIcon className="icon-guide"/>,
          labelKey: "DG.ToolButtonData.guideMenu.title",
          hintKey: "DG.ToolButtonData.guideMenu.toolTip",
          button: <GuideButton key={t("DG.ToolButtonData.guideMenu.title")} guideTileId={guideTileId} />
      }]
        : []
    )
  ]

  if (DEBUG_UNDO) {
    rightButtons.forEach(b => {
      if (b.className) {
        // eslint-disable-next-line no-console
        console.log(`ToolShelf Button "${b.className}": enabled: ${!b.isDisabled?.()} hint: ${t(b.hintKey)}`)
      }
    })
  }

  const keys = getTileComponentKeys()
  const tileComponentInfo = keys.map(key => getTileComponentInfo(key)).filter(info => isShelfTileComponent(info))
  tileComponentInfo.sort((a, b) => a.shelf.position - b.shelf.position)

  function handleTileButtonClick(tileType: string) {
    const tileInfo = getTileComponentInfo(tileType)
    const { undoStringKey = "", redoStringKey = "" } = tileInfo?.shelf || {}
    let tile: Maybe<ITileModel>
    document?.content?.applyModelChange(() => {
      tile = document?.content?.createOrShowTile?.(tileType, { animateCreation: true })
      if (tile) tileInfo?.shelf?.afterCreate?.(tile.content)
    }, {
      notify: () => createTileNotification(tile),
      undoStringKey,
      redoStringKey,
      log: logMessageWithReplacement("Create component: %@", {tileType}, "component")
    })
  }

  const tileButtons = tileComponentInfo.map((info, idx) => {
    if (!info) return null
    const { type, shelf: { ButtonComponent = ToolShelfTileButton, labelKey, hintKey } } = info
    return (
      ButtonComponent
        ? <ButtonComponent
            hint={t(hintKey)}
            key={`${type}-${idx}`}
            label={t(labelKey)}
            onClick={handleTileButtonClick}
            tileType={type}
          />
        : null
    )
  })

  return (
    <Flex className="tool-shelf" alignContent="center" data-testid="tool-shelf">
      <Flex className="tool-shelf-component-buttons">
        {[...tileButtons, <PluginsButton key="plugins-99" />]}
      </Flex>
      <Spacer />
      <Flex className="tool-shelf-right-buttons">
        {rightButtons.map(entry => {
          const { className, icon, labelKey, hintKey, button } = entry
          return (
            button
              ? button
              : <ToolShelfButton
                  className={className}
                  disabled={entry.isDisabled?.()}
                  hint={t(hintKey)}
                  icon={icon}
                  key={labelKey}
                  label={t(labelKey)}
                  onClick={() => entry.onClick?.()}
                />
          )
        })}
      </Flex>
    </Flex>
  )
})
