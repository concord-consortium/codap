import { observer } from "mobx-react-lite"
import { ClipboardMessage, clipboardManager } from "../../lib/clipboard/clipboard-manager"
import { t } from "../../utilities/translation/translate"
import { CopiedCasesAlert } from "../case-tile-common/copied-cases-alert"
import { PasteDataModal } from "./paste-data-modal"

function messageText(message: ClipboardMessage) {
  switch (message.kind) {
    case "copied":
      return t("DG.Inspector.caseTable.exportCaseDialog.copiedData", { vars: [message.description] })
    case "copyUnavailable":
      // The menu item is named from its own string, so the message matches the menu in every language
      return t("V3.clipboard.copyUnavailable", { vars: [t("DG.Inspector.exportCaseData")] })
    case "emptyClipboard":
      return t("V3.clipboard.emptyClipboard")
  }
}

// Renders the clipboard UI requested by the ClipboardManager. It's rendered once at the app level, so the
// dialog and messages outlive the (possibly lazy) menus that trigger clipboard operations.
export const ClipboardHost = observer(function ClipboardHost() {
  const { message, pasteRequest } = clipboardManager

  return (
    <>
      <PasteDataModal
        isOpen={!!pasteRequest}
        permissionDenied={!!pasteRequest?.permissionDenied}
        returnFocus={pasteRequest?.returnFocus}
        onImport={content => clipboardManager.importPastedData(content)}
        onCancel={() => clipboardManager.cancelPaste()}
      />
      <CopiedCasesAlert
        isOpen={!!message}
        message={message ? messageText(message) : ""}
        onClose={() => clipboardManager.closeMessage()}
      />
    </>
  )
})
