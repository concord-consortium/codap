import React from "react"
import { Menu, MenuButton, MenuItem, MenuList } from "@chakra-ui/react"
import HelpIcon from "../../assets/icons/icon-help.svg"
import { useDocumentContent } from "../../hooks/use-document-content"
import { getDefaultLanguage, t } from "../../utilities/translation/translate"
import { kRightButtonBackground, ToolShelfButtonTag } from "./tool-shelf-button"
import { showWebView } from "./tool-shelf-utilities"

import "./tool-shelf.scss"

const helpURL = 'https://codap.concord.org/help'
const helpURL_ja = 'https://codap.concord.org/resources/latest/help-documents/CODAP解説書.pdf'
const helpForumURL = 'https://codap.concord.org/forums/forum/test/'
const projectWebSiteURL = 'https://codap.concord.org'
const privacyURL = 'https://codap.concord.org/privacy'

const translatedHelpURLs: Record<string, string> = {
  "ja": helpURL_ja
}

export const HelpShelfButton = () => {
  const documentContent = useDocumentContent()

  const handleShowHelp = () => {
    const locale = getDefaultLanguage()
    const url = translatedHelpURLs[locale]

    if (url !== undefined) {
      showWebView(url, documentContent)
    } else {
      window.open(helpURL, '_blank')
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
        <MenuList data-testid="help-menu">
          <MenuItem data-testid="help-menu-help-page" onClick={handleShowHelp}>
            {t("DG.AppController.optionMenuItems.help")}
          </MenuItem>
          <MenuItem data-testid="help-menu-forum-page" onClick={()=>window.open(helpForumURL)}>
            {t("DG.AppController.optionMenuItems.help-forum")}
          </MenuItem>
          <MenuItem data-testid="help-menu-project-page" onClick={()=>window.open(projectWebSiteURL)}>
            {t("DG.AppController.optionMenuItems.toWebSite")}
          </MenuItem>
          <MenuItem data-testid="help-menu-privacy-page" onClick={()=>window.open(privacyURL)}>
            {t("DG.AppController.optionMenuItems.toPrivacyPage")}
          </MenuItem>
        </MenuList>
      </Menu>
    </>
  )
}
