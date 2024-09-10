import {Flex, Spacer, useToast} from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import React from "react"
import { SetRequired } from "type-fest"
import { getRedoStringKey, getUndoStringKey } from "../../models/history/codap-undo-types"
import {
  getTileComponentInfo, getTileComponentKeys, ITileComponentInfo
} from "../../models/tiles/tile-component-info"
import UndoIcon from "../../assets/icons/icon-undo.svg"
import RedoIcon from "../../assets/icons/icon-redo.svg"
import TileListIcon from "../../assets/icons/icon-tile-list.svg"
import OptionsIcon from "../../assets/icons/icon-options.svg"
import HelpIcon from "../../assets/icons/icon-help.svg"
import GuideIcon from "../../assets/icons/icon-guide.svg"
import { DEBUG_UNDO } from "../../lib/debug"
import { IDocumentModel } from "../../models/document/document"
import { t } from "../../utilities/translation/translate"
import { OptionsShelfButton } from "./options-button"
import { TilesListShelfButton } from "./tiles-list-button"
import { PluginsButton } from "./plugins-button"
import { kRightButtonBackground, ToolShelfButton, ToolShelfTileButton } from "./tool-shelf-button"
import { logMessageWithReplacement } from "../../lib/log-message"

import "./tool-shelf.scss"

// Type for components known to have shelf properties
type IShelfTileComponentInfo = SetRequired<ITileComponentInfo, "shelf">
export function isShelfTileComponent(info?: ITileComponentInfo): info is IShelfTileComponentInfo {
  return !!info && "shelf" in info && info.shelf != null
}

interface IRightButtonEntry {
  className?: string
  icon: React.ReactElement
  label: string
  hint: string
  button?: React.ReactElement
  isDisabled?: () => boolean
  onClick?: () => void
}

interface IProps {
  document: IDocumentModel
}
export const ToolShelf = observer(function ToolShelf({ document }: IProps) {
  const toast = useToast()
  const labelToast = (entry: IRightButtonEntry) => toast({
    title: `"${entry.label}" button clicked`,
    status: "success",
    duration: 9000,
    isClosable: true
  })

  const undoManager = document?.treeManagerAPI?.undoManager
  const rightButtons: IRightButtonEntry[] = [
    {
      className: "undo-button",
      icon: <UndoIcon className="icon-undo"/>,
      label: t("DG.mainPage.mainPane.undoButton.title"),
      hint: t(getUndoStringKey(undoManager)),
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
      label: t("DG.mainPage.mainPane.redoButton.title"),
      hint: t(getRedoStringKey(undoManager)),
      isDisabled: () => !document?.canRedo,
      onClick: () => {
        if (document?.canRedo) {
          document.redoLastAction()
        }
      }
    },
    {
      icon: <TileListIcon className="icon-tile-list"/>,
      label: t("DG.ToolButtonData.tileListMenu.title"),
      hint: t("DG.ToolButtonData.tileListMenu.toolTip"),
      button: <TilesListShelfButton key={t("DG.ToolButtonData.tileListMenu.title")} />
    },
    {
      icon: <OptionsIcon className="icon-options"/>,
      label: t("DG.ToolButtonData.optionMenu.title"),
      hint: t("DG.ToolButtonData.optionMenu.toolTip"),
      button: <OptionsShelfButton key={t("DG.ToolButtonData.optionMenu.title")} />
    },
    {
      icon: <HelpIcon className="icon-help"/>,
      label: t("DG.ToolButtonData.help.title"),
      hint: t("DG.ToolButtonData.help.toolTip")
    },
    {
      icon: <GuideIcon className="icon-guide"/>,
      label: t("DG.ToolButtonData.guideMenu.title"),
      hint: t("DG.ToolButtonData.guideMenu.toolTip")
    }
  ]

  if (DEBUG_UNDO) {
    rightButtons.forEach(b => {
      if (b.className) {
        // eslint-disable-next-line no-console
        console.log(`ToolShelf Button "${b.className}": enabled: ${!b.isDisabled?.()} hint: ${b.hint}`)
      }
    })
  }

  const keys = getTileComponentKeys()
  const tileComponentInfo = keys.map(key => getTileComponentInfo(key)).filter(info => isShelfTileComponent(info))
  tileComponentInfo.sort((a, b) => a.shelf.position - b.shelf.position)

  function handleTileButtonClick(tileType: string) {
    const tileInfo = getTileComponentInfo(tileType)
    const { undoStringKey = "", redoStringKey = "" } = tileInfo?.shelf || {}
    document?.content?.applyModelChange(() => {
      document?.content?.createOrShowTile?.(tileType, { animateCreation: true })
    }, { undoStringKey, redoStringKey, log: logMessageWithReplacement("Create component: %@",
                                                { tileType, category: "component" }) })
  }

  function handleRightButtonClick(entry: IRightButtonEntry) {
    if (entry.onClick) {
      entry.onClick()
    }
    else {
      labelToast(entry)
    }
  }

  const tileButtons = tileComponentInfo.map((info, idx) => {
    if (!info) return null
    const { type, shelf: { ButtonComponent = ToolShelfTileButton, labelKey, hintKey } } = info
    const label = t(labelKey)
    const hint = t(hintKey)
    return (
      ButtonComponent
        ? <ButtonComponent tileType={type} key={`${type}-${idx}`} label={label} hint={hint}
              onClick={handleTileButtonClick}/>
        : null
    )
  })

  return (
    <Flex className='tool-shelf' alignContent='center' data-testid='tool-shelf'>
      <Flex className="tool-shelf-component-buttons">
        {[...tileButtons, <PluginsButton key="plugins-99" />]}
      </Flex>
      <Spacer/>
      <Flex className="tool-shelf-right-buttons">
        {rightButtons.map(entry => {
          const { className, icon, label, hint, button } = entry
          return (
            button
              ? button
              : <ToolShelfButton key={label} className={className} icon={icon} label={label} hint={hint}
                    disabled={entry.isDisabled?.()} background={kRightButtonBackground}
                    onClick={() => handleRightButtonClick(entry)} />
          )
        })}
      </Flex>
    </Flex>
  )
})
