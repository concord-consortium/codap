import { useDisclosure } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import React from "react"
import { useDocumentContent } from "../../hooks/use-document-content"
import { t } from "../../utilities/translation/translate"
import { InspectorButtonNew, InspectorPanelNew } from "../inspector-panel-new"
import { ITileInspectorPanelProps } from "../tiles/tile-base-props"
import { WebViewUrlModal } from "./web-view-url-modal"
import { isWebViewModel } from "./web-view-model"
import { logMessageWithReplacement } from "../../lib/log-message"

import MediaToolIcon from "../../assets/icons/inspector-panel/web-page-icon.svg"

import "./web-view-inspector.scss"

export const WebViewInspector = observer(function WebViewInspector({tile, show}: ITileInspectorPanelProps) {
  const documentContent = useDocumentContent()
  const webViewModel = isWebViewModel(tile?.content) ? tile?.content : undefined
  const { isOpen, onClose, onOpen } = useDisclosure()

  const handleSetWebViewUrlAccept = (url: string) => {
    if (!url.startsWith("https://") && !url.startsWith("http://")) {
      url = `https://${url}`
    }
    documentContent?.applyModelChange(() => {
      webViewModel?.setUrl(url)
    }, {
      undoStringKey: "V3.Undo.webView.changeUrl",
      redoStringKey: "V3.Redo.webView.changeUrl",
      log: logMessageWithReplacement("Change web view URL: %@", {url})
    })
  }

  return (
    <>
      <InspectorPanelNew component="web-view" show={show}>
        <InspectorButtonNew
          bottom={true}
          label={t("V3.WebView.Inspector.URL")}
          onButtonClick={onOpen}
          testId={"web-view-edit-url-button"}
          tooltip={t("DG.Inspector.webViewEditURL.toolTip")}
          top={true}
        >
          <MediaToolIcon />
        </InspectorButtonNew>
      </InspectorPanelNew>
      { isOpen &&
        <WebViewUrlModal
          currentValue={webViewModel?.url}
          isOpen={isOpen}
          onAccept={handleSetWebViewUrlAccept}
          onClose={onClose}
        />
      }
    </>
  )
})
