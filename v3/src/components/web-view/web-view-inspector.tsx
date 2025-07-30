import { useDisclosure } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import React, { useEffect } from "react"
import { useDocumentContent } from "../../hooks/use-document-content"
import { logMessageWithReplacement } from "../../lib/log-message"
import { t } from "../../utilities/translation/translate"
import { InspectorButton, InspectorPanel } from "../inspector-panel"
import { ITileInspectorPanelProps } from "../tiles/tile-base-props"
import { WebViewUrlModal } from "./web-view-url-modal"
import { isWebViewModel } from "./web-view-model"

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

  useEffect(() => {
    if (webViewModel?.autoOpenUrlDialog) {
      onOpen()
      webViewModel.setAutoOpenUrlDialog(false)
    }
  }, [onOpen, webViewModel, webViewModel?.autoOpenUrlDialog])

  return (
    <>
      <InspectorPanel component="web-view" show={show}>
        <InspectorButton
          bottom={true}
          label={t("V3.WebView.Inspector.URL")}
          onButtonClick={onOpen}
          testId={"web-view-edit-url-button"}
          tooltip={t("DG.Inspector.webViewEditURL.toolTip")}
          top={true}
        >
          <MediaToolIcon />
        </InspectorButton>
      </InspectorPanel>
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
