import { Flex, Spacer } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import React, { useCallback, useRef } from "react"
import { SetRequired } from "type-fest"
import { useRovingToolbarFocus } from "../../hooks/use-roving-toolbar-focus"
import { useRegisterSection } from "../../hooks/use-section-navigation"
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
import {
  kComponentTypeV3ToV2Map, kV2DITypeToLifecycleNameMap
} from "../../data-interactive/data-interactive-component-types"
import { IDocumentModel } from "../../models/document/document"
import { isFreeTileLayout } from "../../models/document/free-tile-row"
import { getTileContentInfo } from "../../models/tiles/tile-content-info"
import { ITileModel } from "../../models/tiles/tile-model"
import { componentShowHideNotification, createTileNotification } from "../../models/tiles/tile-notifications"
import { persistentState } from "../../models/persistent-state"
import { uiState } from "../../models/ui-state"
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

function getGuideTileId(document: IDocumentModel) {
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
  const toolbarRef = useRef<HTMLDivElement>(null)
  useRegisterSection("toolshelf", toolbarRef, 1)
  const guideTileId = getGuideTileId(document)

  // Get all top-level toolbar buttons, excluding items inside dropdown menus
  const getToolbarButtons = useCallback(() => {
    if (!toolbarRef.current) return []
    const allButtons = toolbarRef.current.querySelectorAll<HTMLElement>("button")
    return Array.from(allButtons).filter(btn => !btn.closest(".tool-shelf-menu-list"))
  }, [])
  const { onFocusCapture, onKeyDownCapture } = useRovingToolbarFocus({
    dependencies: [guideTileId, persistentState.toolbarPosition],
    getItems: getToolbarButtons,
    orientation: persistentState.toolbarPosition === "Top" ? "horizontal" : "vertical"
  })

  if (uiState.standaloneMode) return null

  const undoManager = document?.treeManagerAPI?.undoManager
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
    const isSingleton = !!getTileContentInfo(tileType)?.isSingleton
    const diType = kComponentTypeV3ToV2Map[tileType]

    // Compute the V2-compat singleton path's preconditions and resulting state up front.
    // We take the singleton path only when ALL of these hold:
    //   - tile is a singleton (`isSingleton`)
    //   - there's a V2 type mapping (`diType`) — otherwise undo keys + notification
    //     `type`/`diType` would be undefined
    //   - the toggle will actually change visibility — `toggleSingletonTileVisibility`
    //     gates `setHidden` on `isFreeTileLayout` (document-content.ts:225), so in
    //     mosaic/legacy layouts the click is a no-op visually. Emitting V2 hide/show in
    //     that case would lie about what happened.
    // When any precondition fails we fall back to the generic create-notification path.
    let useSingletonV2Path = isSingleton && !!diType
    let resultingShowHide: "show" | "hide" | undefined
    if (useSingletonV2Path) {
      const existingTiles = document?.content?.getTilesOfType(tileType) ?? []
      if (existingTiles.length > 0) {
        const existingLayout = document?.content?.getTileLayoutById(existingTiles[0].id)
        if (isFreeTileLayout(existingLayout)) {
          resultingShowHide = existingLayout.isHidden ? "show" : "hide"
        } else {
          // Non-free layout — toggleSingletonTileVisibility won't toggle visibility.
          useSingletonV2Path = false
        }
      } else {
        // No existing tile — `createTile` runs and the singleton appears.
        resultingShowHide = "show"
      }
    }

    let undoStringKey = tileInfo?.shelf?.undoStringKey ?? ""
    let redoStringKey = tileInfo?.shelf?.redoStringKey ?? ""
    let log: ReturnType<typeof logMessageWithReplacement> | string =
      logMessageWithReplacement("Create component: %@", {tileType}, "component")

    // For singletons with a V2 mapping in a hideable layout, V2 emits `hide`/`show`
    // rather than `create` (the op reflects the resulting visible state). Use V2's
    // matching add/delete undo strings — `DG.{Undo,Redo}.toggleComponent.{add,delete}.
    // {lifecycleName}` per document_controller.js:1644-1666. lifecycleName comes from
    // the V2 lifecycle-name override (calculator → 'calcView') with DI-name fallback.
    if (useSingletonV2Path) {
      const lifecycleName = kV2DITypeToLifecycleNameMap[diType] ?? diType
      const action = resultingShowHide === "hide" ? "delete" : "add"
      undoStringKey = `DG.Undo.toggleComponent.${action}.${lifecycleName}`
      redoStringKey = `DG.Redo.toggleComponent.${action}.${lifecycleName}`
      log = action === "add"
        ? `Add toggle component: ${lifecycleName}`
        : `Remove toggle component: ${lifecycleName}`
    }

    let tile: Maybe<ITileModel>
    document?.content?.applyModelChange(() => {
      tile = document?.content?.createOrShowTile?.(tileType, { animateCreation: true })
      if (tile) tileInfo?.shelf?.afterCreate?.(tile.content)
    }, {
      notify: () => useSingletonV2Path
        ? componentShowHideNotification(tile, resultingShowHide ?? "show")
        : createTileNotification(tile),
      undoStringKey,
      redoStringKey,
      log
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
    <Flex
      ref={toolbarRef}
      className="tool-shelf"
      alignContent="center"
      data-testid="tool-shelf"
      role="toolbar"
      aria-label={t("V3.app.toolbar.ariaLabel")}
      aria-orientation={persistentState.toolbarPosition === "Top" ? "horizontal" : "vertical"}
      onFocusCapture={onFocusCapture}
      onKeyDownCapture={onKeyDownCapture}
    >
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
