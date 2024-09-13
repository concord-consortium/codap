import React from "react"
import { Menu, MenuButton, MenuItem, MenuList } from "@chakra-ui/react"
import HelpIcon from "../../assets/icons/icon-help.svg"
import { useDocumentContent } from "../../hooks/use-document-content"
import { getDefaultLanguage, t } from "../../utilities/translation/translate"
import { kWebViewTileType } from "../web-view/web-view-defs"
import { isWebViewModel } from "../web-view/web-view-model"
import { kRightButtonBackground, ToolShelfButtonTag } from "./tool-shelf-button"
import { logMessageWithReplacement } from "../../lib/log-message"

import "./tool-shelf.scss"

const showHelpURL = 'https://codap.concord.org/help'
const showHelpURL_ja = 'https://codap.concord.org/resources/latest/help-documents/CODAP解説書.pdf'
const showHelpForumURL = 'https://codap.concord.org/forums/forum/test/'
const showWebSiteURL = 'https://codap.concord.org'
const showPrivacyURL = 'https://codap.concord.org/privacy'

const helpURLs: Record<string, string> = {
  "ja": showHelpURL_ja
}

export const HelpShelfButton = () => {
  const documentContent = useDocumentContent()

  const handleShowHelp = () => {
    const locale = getDefaultLanguage()
    const url = helpURLs[locale]

    if (url !== undefined) {
      documentContent?.applyModelChange(() => {
        const tile = documentContent?.createOrShowTile?.(kWebViewTileType)
        isWebViewModel(tile?.content) && tile?.content.setUrl(`${url}`)
      }, {
        undoStringKey: "V3.Undo.webView.show",
        redoStringKey: "V3.Redo.webView.show",
        log: logMessageWithReplacement("Show web view: %@", {url}, "document")
      })
    } else {
      window.open(showHelpURL, '_blank')
    }
  }

  return (
    <>
      <Menu isLazy>
        <MenuButton
          className="tool-shelf-button help"
          title={t("DG.ToolButtonData.help.toolTip")}
          data-testid="tool-shelf-button-help"
        >
          <HelpIcon />
          <ToolShelfButtonTag
            bg={kRightButtonBackground}
            className="web-view"
            label={t("DG.ToolButtonData.help.title")}
          />
        </MenuButton>
        <MenuList>
          <MenuItem data-testid="tool-shelf-button-help" onClick={handleShowHelp}>
            {t("DG.AppController.optionMenuItems.help")}
          </MenuItem>
          <MenuItem data-testid="tool-shelf-button-web-view" onClick={()=>window.open(showHelpForumURL)}>
            {t("DG.AppController.optionMenuItems.help-forum")}
          </MenuItem>
          <MenuItem data-testid="tool-shelf-button-web-view" onClick={()=>window.open(showWebSiteURL)}>
            {t("DG.AppController.optionMenuItems.toWebSite")}
          </MenuItem>
          <MenuItem data-testid="tool-shelf-button-web-view" onClick={()=>window.open(showPrivacyURL)}>
            {t("DG.AppController.optionMenuItems.toPrivacyPage")}
          </MenuItem>
        </MenuList>
      </Menu>
    </>
  )
}
