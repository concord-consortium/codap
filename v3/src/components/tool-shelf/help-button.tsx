import React from "react"
import { clsx } from "clsx"
import { Menu, MenuButton, MenuItem, MenuList, useDisclosure } from "@chakra-ui/react"
import { useDocumentContent } from "../../hooks/use-document-content"
import { gLocale } from "../../utilities/translation/locale"
import { getSpecialLangFontClassName } from "../../utilities/translation/languages"
import { t } from "../../utilities/translation/translate"
import { ToolShelfButtonTag } from "./tool-shelf-button"
import { showWebView } from "./tool-shelf-utilities"
import HelpPagesIcon from "../../assets/icons/icon-help-pages.svg"
import HelpForumIcon from "../../assets/icons/icon-help-forum.svg"
import ProjectWebSiteIcon from "../../assets/icons/icon-codap-project.svg"
import WebViewIcon from "../../assets/icons/icon-media-tool.svg"
import HelpIcon from "../../assets/icons/icon-help.svg"

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
  const langClass = getSpecialLangFontClassName(gLocale.current)
  const { isOpen, onOpen, onClose } = useDisclosure();

  const handleShowHelp = () => {
    const url = translatedHelpURLs[gLocale.current]

    if (url !== undefined) {
      showWebView(url, documentContent)
    } else {
      window.open(helpURL, '_blank')
    }
  }

  return (
    <>
      <Menu isLazy autoSelect={false} isOpen={isOpen} onOpen={onOpen} onClose={onClose}>
        <MenuButton
          className={clsx("tool-shelf-button", "tool-shelf-menu", "help", langClass, {"menu-open": isOpen})}
          title={t("DG.ToolButtonData.help.toolTip")}
          data-testid="tool-shelf-button-help"
        >
          <HelpIcon />
          <ToolShelfButtonTag
            className="tool-shelf-tool-label web-view"
            label={t("DG.ToolButtonData.help.title")}
          />
        </MenuButton>
        <MenuList className="tool-shelf-menu-list help" data-testid="help-menu">
          <MenuItem data-testid="help-menu-help-page" onClick={handleShowHelp}
              className="tool-shelf-menu-item help">
            <HelpPagesIcon className="menu-icon help-icon" />
            {t("DG.AppController.optionMenuItems.help")}
          </MenuItem>
          <MenuItem data-testid="help-menu-forum-page" onClick={()=>window.open(helpForumURL)}
              className="tool-shelf-menu-item forum">
            <HelpForumIcon className="menu-icon help-icon" />
            {t("DG.AppController.optionMenuItems.help-forum")}
          </MenuItem>
          <MenuItem data-testid="help-menu-project-page" onClick={()=>window.open(projectWebSiteURL)}
              className="tool-shelf-menu-item project">
            <ProjectWebSiteIcon className="menu-icon help-icon" />
            {t("DG.AppController.optionMenuItems.toWebSite")}
          </MenuItem>
          <MenuItem data-testid="help-menu-privacy-page" onClick={()=>window.open(privacyURL)}
              className="tool-shelf-menu-item privacy">
            <WebViewIcon className="menu-icon help-icon" />
            {t("DG.AppController.optionMenuItems.toPrivacyPage")}
          </MenuItem>
        </MenuList>
      </Menu>
    </>
  )
}
