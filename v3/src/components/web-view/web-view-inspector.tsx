import {useDisclosure} from "@chakra-ui/react"
import {observer} from "mobx-react-lite"
import React, {useRef, useState} from "react"
import MediaToolIcon from "../../assets/icons/icon-media-tool.svg"
import { useDocumentContext } from "../../hooks/use-document-context"
import t from "../../utilities/translation/translate"
import {InspectorButton, InspectorPanel} from "../inspector-panel"
import {ITileInspectorPanelProps} from "../tiles/tile-base-props"
import {WebViewUrlModal} from "./web-view-url-modal"
import {isWebViewModel} from "./web-view-model"

import "./web-view-inspector.scss"

export const WebViewInspector = observer(function WebViewInspector({tile, show}: ITileInspectorPanelProps) {
  const document = useDocumentContext()
  const webViewModel = isWebViewModel(tile?.content) ? tile?.content : undefined
  const panelRef = useRef<HTMLDivElement>()
  const webViewModal = useDisclosure()
  const [webViewModalIsOpen, setWebViewModalIsOpen] = useState(false)

  const handleModalOpen = (open: boolean) => {
    setWebViewModalIsOpen(open)
  }

  const handleSetWebViewUrlOpen = () => {
    webViewModal.onOpen()
    handleModalOpen(true)
  }

  const handleSetWebViewUrlClose = () => {
    webViewModal.onClose()
    handleModalOpen(false)
  }

  const handleSetWebViewUrlAccept = (url: string) => {
    document?.content?.applyUndoableAction(() => {
      webViewModel?.setUrl(url)
    }, "V3.Undo.webView.changeUrl", "V3.Redo.webView.changeUrl")
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
      { webViewModalIsOpen &&
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
