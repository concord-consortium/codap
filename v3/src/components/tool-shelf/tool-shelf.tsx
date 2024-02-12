import {Flex, Spacer, useToast} from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import React from "react"
import { SetRequired } from "type-fest"
import { ToolShelfButton, ToolShelfTileButton } from "./tool-shelf-button"
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
import { useDocumentContext } from "../../hooks/use-document-context"
import { DEBUG_UNDO } from "../../lib/debug"
import t from "../../utilities/translation/translate"
import { OptionsShelfButton } from "./options-button"

import "./tool-shelf.scss"

// Type for components known to have shelf properties
type IShelfTileComponentInfo = SetRequired<ITileComponentInfo, "shelf">

interface IRightButtonEntry {
  className?: string
  icon: React.ReactElement
  label: string
  hint: string
  button?: React.ReactElement
  isDisabled?: () => boolean
  onClick?: () => void
}
export const ToolShelf = observer(function ToolShelf() {
  const document = useDocumentContext()
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
      hint: t("DG.ToolButtonData.tileListMenu.toolTip")
    },
    {
      icon: <OptionsIcon className="icon-options"/>,
      label: t("DG.ToolButtonData.optionMenu.title"),
      hint: t("DG.ToolButtonData.optionMenu.toolTip"),
      button: <OptionsShelfButton />
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
  const entries = keys.map(key => getTileComponentInfo(key))
                      .filter(info => info?.shelf != null) as IShelfTileComponentInfo[]
  entries.sort((a, b) => a.shelf.position - b.shelf.position)

  function handleTileButtonClick(tileType: string) {
    const undoRedoStringKeysMap: Record<string, [string, string]> = {
      Calculator: ["DG.Undo.toggleComponent.add.calcView", "DG.Redo.toggleComponent.add.calcView"],
      CodapSlider: ["DG.Undo.sliderComponent.create", "DG.Redo.sliderComponent.create"],
      Graph: ["DG.Undo.graphComponent.create", "DG.Redo.graphComponent.create"],
      Map: ["DG.Undo.map.create", "DG.Redo.map.create"]
    }
    const [undoStringKey = "", redoStringKey = ""] = undoRedoStringKeysMap[tileType] || []
    document?.content?.applyUndoableAction(() => {
      document?.content?.createOrShowTile?.(tileType)
    }, undoStringKey, redoStringKey)
  }

  function handleRightButtonClick(entry: IRightButtonEntry) {
    if (entry.onClick) {
      entry.onClick()
    }
    else {
      labelToast(entry)
    }
  }

  return (
    <Flex className='tool-shelf' alignContent='center' data-testid='tool-shelf'>
      <Flex className="tool-shelf-component-buttons">
        {entries.map((entry, idx) => {
          if (!entry) return null
          const { type, shelf: { ButtonComponent = ToolShelfTileButton, labelKey, hintKey } } = entry
          const label = t(labelKey)
          const hint = t(hintKey)
          return (
            ButtonComponent
              ? <ButtonComponent tileType={type} key={`${type}-${idx}`} label={label} hint={hint}
                    onClick={handleTileButtonClick}/>
              : null
          )
        })}
      </Flex>
      <Spacer/>
      <Flex className="tool-shelf-right-buttons">
        {rightButtons.map(entry => {
          const { className, icon, label, hint, button } = entry
          return (
            button
              ? button
              : <ToolShelfButton key={label} className={className} icon={icon} label={label} hint={hint}
                    disabled={entry.isDisabled?.()} background="#ececec"
                    onClick={() => handleRightButtonClick(entry)} />
          )
        })}
      </Flex>
    </Flex>
  )
})
