import React from "react"
import { observer } from "mobx-react-lite"
import { clsx } from "clsx"
import { Menu, MenuButton, MenuItem, MenuList, useDisclosure } from "@chakra-ui/react"
import { useDocumentContent } from "../../hooks/use-document-content"
import { persistentState } from "../../models/persistent-state"
import { getSpecialLangFontClassName, t } from "../../utilities/translation/translate"
import GuideIcon from "../../assets/icons/icon-guide.svg"
import { logMessageWithReplacement } from "../../lib/log-message"
import { isWebViewModel } from "../web-view/web-view-model"
import { ToolShelfButtonTag } from "./tool-shelf-button"
import { handleSelectTile } from "./tool-shelf-utilities"

import "./tool-shelf.scss"

interface IProps {
  guideTileId: string
}

export const GuideButton = observer(function GuideButton(props: IProps) {
  const { guideTileId } = props
  const documentContent = useDocumentContent()
  const langClass = getSpecialLangFontClassName()
  const {isOpen, onOpen, onClose} = useDisclosure()
  const webViewModel = documentContent?.getTile(guideTileId)?.content
  if (!isWebViewModel(webViewModel) || !webViewModel.isGuide) return null

  const showGuidePage = (url:string) => {
    if (url !== webViewModel.url) {
      documentContent?.applyModelChange(() => {
        handleSelectTile(guideTileId, documentContent)
        webViewModel.setUrl(url)
      }, {
        undoStringKey: "DG.Undo.guide.navigate",
        redoStringKey: "DG.Redo.guide.navigate",
        log: logMessageWithReplacement("Show guide page: %@", {url}, "document")
      })
    }
  }

  const placement = persistentState.toolbarPosition === "Top" ? "bottom-end" : "right-end"
  return (
    <>
      <Menu isLazy autoSelect={false} isOpen={isOpen} onOpen={onOpen} onClose={onClose} placement={placement}>
        <MenuButton
          className={clsx("tool-shelf-button", "tool-shelf-menu", langClass, {"menu-open": isOpen})}
          title={t("DG.ToolButtonData.guideMenu.toolTip")}
          data-testid="tool-shelf-button-guide"
        >
          <GuideIcon className="icon-guide"/>
          <ToolShelfButtonTag
            className="tool-shelf-tool-label"
            label={t("DG.ToolButtonData.guideMenu.title")}
          />
        </MenuButton>
        <MenuList className="tool-shelf-menu-list top-menu" data-testid="guide-menu" >
          <MenuItem
            key={"show-guide"}
            className="tool-shelf-menu-item"
            data-testid="show-guide-item"
            onClick={() => handleSelectTile(guideTileId, documentContent)}
          >
            {`${t("DG.ToolButtonData.guideMenu.showGuide")}`}
          </MenuItem>
          {webViewModel.pages.map((page, index) => {
            return (
              <MenuItem key={index} data-testid="guide-page-list-item"
                        className="tool-shelf-menu-item"
                        onClick={()=>showGuidePage(page.url || "")}
              >
                {page.title}
              </MenuItem>
            )
          })}
        </MenuList>
      </Menu>
    </>
  )
})
