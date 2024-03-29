import {useDisclosure} from "@chakra-ui/react"
import {observer} from "mobx-react-lite"
import React, {useRef} from "react"
import MediaToolIcon from "../../assets/icons/icon-media-tool.svg"
import { useDocumentContent } from "../../hooks/use-document-content"
import { t } from "../../utilities/translation/translate"
import {InspectorButton, InspectorPanel} from "../inspector-panel"
import {ITileInspectorPanelProps} from "../tiles/tile-base-props"
import {WebViewUrlModal} from "./web-view-url-modal"
import {isWebViewModel} from "./web-view-model"

import "./web-view-inspector.scss"

export const WebViewInspector = observer(function WebViewInspector({tile, show}: ITileInspectorPanelProps) {
  const documentContent = useDocumentContent()
  const webViewModel = isWebViewModel(tile?.content) ? tile?.content : undefined
  const panelRef = useRef<HTMLDivElement>()
  const webViewModal = useDisclosure()

  const handleSetWebViewUrlOpen = () => {
    webViewModal.onOpen()
  }

  const handleSetWebViewUrlClose = () => {
    webViewModal.onClose()
  }

  const handleSetWebViewUrlAccept = (url: string) => {
    documentContent?.applyUndoableAction(() => {
      webViewModel?.setUrl(url)
    }, {
      undoStringKey: "V3.Undo.webView.changeUrl",
      redoStringKey: "V3.Redo.webView.changeUrl"
    })
  }

  return (
    <>
      <InspectorPanel ref={panelRef} component="web-view" show={show}>
        <InspectorButton
          onButtonClick={handleSetWebViewUrlOpen}
          showMoreOptions={false}
          testId={"web-view-edit-url-button"}
          tooltip={t("DG.Inspector.webViewEditURL.toolTip")}
        >
          <MediaToolIcon className="white-icon" />
        </InspectorButton>
      </InspectorPanel>
      { webViewModal.isOpen &&
        <WebViewUrlModal
          currentValue={webViewModel?.url}
          isOpen={webViewModal.isOpen}
          onAccept={handleSetWebViewUrlAccept}
          onClose={handleSetWebViewUrlClose}
        />
      }
    </>
  )
})
