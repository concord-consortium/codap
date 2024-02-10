import React, { useState } from "react"
import { Menu, MenuButton, MenuItem, MenuList, Tag, useDisclosure } from "@chakra-ui/react"
import OptionsIcon from "../../assets/icons/icon-options.svg"
import { useDocumentContext } from "../../hooks/use-document-context"
import t from "../../utilities/translation/translate"
import { kWebViewTileType } from "../web-view/web-view-defs"
import { isWebViewModel } from "../web-view/web-view-model"
import { WebViewUrlModal } from "../web-view/web-view-url-modal"

import "./tool-shelf.scss"

export const OptionsShelfButton = () => {
  const document = useDocumentContext();
  const formulaModal = useDisclosure()
  const [webViewModalIsOpen, setWebViewModalIsOpen] = useState(false)

  const handleModalOpen = (open: boolean) => {
    setWebViewModalIsOpen(open)
  }

  const handleSetWebViewUrlOpen = () => {
    formulaModal.onOpen()
    handleModalOpen(true)
  }

  const handleSetWebViewUrlClose = () => {
    formulaModal.onClose()
    handleModalOpen(false)
  }

  const handleSetWebViewUrlAccept = (url: string) => {
    document?.content?.applyUndoableAction(() => {
      const tile = document?.content?.createOrShowTile?.(kWebViewTileType)
      isWebViewModel(tile?.content) && tile?.content.setUrl(url)
    }, "DG.Undo.webView.show", "DG.Redo.webView.show")
  }
  return (
    <>
      <Menu isLazy>
        <MenuButton
          className="tool-shelf-button menu web-view"
          title={t("DG.ToolButtonData.optionMenu.title")}
          data-testid="tool-shelf-button-options"
        >
          <OptionsIcon />
          <Tag className="tool-shelf-tool-label web-view">{t("DG.ToolButtonData.optionMenu.title")}</Tag>
        </MenuButton>
        <MenuList>
          <MenuItem data-testid="tool-shelf-button-web-view" onClick={handleSetWebViewUrlOpen}>
            {t("DG.AppController.optionMenuItems.viewWebPage")}
          </MenuItem>
        </MenuList>
      </Menu>
      { webViewModalIsOpen &&
        <WebViewUrlModal
          isOpen={formulaModal.isOpen}
          onAccept={handleSetWebViewUrlAccept}
          onClose={handleSetWebViewUrlClose}
        />
      }
    </>
  )
}
