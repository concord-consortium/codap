import {Flex, Spacer, useToast} from "@chakra-ui/react"
import React from "react"
import { SetRequired } from "type-fest"
import { ToolShelfButton, ToolShelfTileButton } from "./tool-shelf-buttons"
import { IDocumentContentModel } from "../../models/document/document-content"
import {
  getTileComponentInfo, getTileComponentKeys, ITileComponentInfo
} from "../../models/tiles/tile-component-info"
import UndoIcon from "../../assets/icons/icon-undo.svg"
import RedoIcon from "../../assets/icons/icon-redo.svg"
import TileListIcon from "../../assets/icons/icon-tile-list.svg"
import OptionsIcon from "../../assets/icons/icon-options.svg"
import HelpIcon from "../../assets/icons/icon-help.svg"
import GuideIcon from "../../assets/icons/icon-guide.svg"
import t from "../../utilities/translation/translate"

import "./tool-shelf.scss"

// Type for components known to have shelf properties
type IShelfTileComponentInfo = SetRequired<ITileComponentInfo, "shelf">

interface IRightButtonEntry {
  className?: string
  icon: React.ReactElement
  label: string
  hint: string
  onClick?: () => void
}
interface IProps {
  content?: IDocumentContentModel
}
export const ToolShelf = ({ content }: IProps) => {
  const toast = useToast()
  const labelToast = (entry: IRightButtonEntry) => toast({
    title: `"${entry.label}" button clicked`,
    status: "success",
    duration: 9000,
    isClosable: true
  })


  const rightButtons: IRightButtonEntry[] = [
    {
      className: "undo-button",
      icon: <UndoIcon className="icon-undo"/>,
      label: t("DG.mainPage.mainPane.undoButton.title"),
      hint: t("DG.mainPage.mainPane.undoButton.toolTip")
    },
    {
      className: "redo-button",
      icon: <RedoIcon className="icon-redo"/>,
      label: t("DG.mainPage.mainPane.redoButton.title"),
      hint: t("DG.mainPage.mainPane.redoButton.toolTip")
    },
    {
      icon: <TileListIcon className="icon-tile-list"/>,
      label: t("DG.ToolButtonData.tileListMenu.title"),
      hint: t("DG.ToolButtonData.tileListMenu.toolTip")
    },
    {
      icon: <OptionsIcon className="icon-options"/>,
      label: t("DG.ToolButtonData.optionMenu.title"),
      hint: t("DG.ToolButtonData.optionMenu.toolTip")
    },
    {
      icon: <HelpIcon className="icon-help"/>,
      label: t("DG.ToolButtonData.help.title"),
      hint: t("DG.ToolButtonData.help.toolTip")
    },
    {
      icon: <GuideIcon className="icon-guid"/>,
      label: t("DG.ToolButtonData.guideMenu.title"),
      hint: t("DG.ToolButtonData.guideMenu.toolTip")
    }
  ]

  const keys = getTileComponentKeys()
  const entries = keys.map(key => getTileComponentInfo(key))
                      .filter(info => info?.shelf != null) as IShelfTileComponentInfo[]
  entries.sort((a, b) => a.shelf.position - b.shelf.position)

  function handleTileButtonClick(tileType: string) {
    content?.createOrShowTile?.(tileType)
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
          const { className, icon, label, hint } = entry
          return <ToolShelfButton key={entry.label} className={className} icon={icon} label={label} hint={hint}
                    background="#ececec" onClick={() => handleRightButtonClick(entry)} />
        })}
      </Flex>
    </Flex>
  )
}
