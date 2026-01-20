import { useCallback, useEffect } from "react"
import { FallbackProps } from "react-error-boundary"
import { CloudFileManager } from "@concord-consortium/cloud-file-manager"
import { appState } from "../models/app-state"
import { t } from "../utilities/translation/translate"

export function useUncaughtErrorHandler(cfm: CloudFileManager) {
  const userCanSaveCopy = useCallback(() => {
    // TODO: There are other cases where the user can't save a copy
    return !cfm.appOptions.hideMenuBar
  }, [cfm.appOptions.hideMenuBar])

  const fallbackRender = useCallback(({ error }: FallbackProps) => {
    // Notes:
    // 1. If we are running embedded in the Activity Player or some other
    // system that does autosaving, the file menu may be disabled so
    // the user can't save a copy of the document.
    // 2. We are not using the resetErrorBoundary function provided to the
    // fallbackRender function because we are basically asking them to
    // reload the page anyhow, so giving them another option to try
    // to render the document again would just be confusing.
    return (
      <div className="document-render-error">
        <h1>{t("V3.app.documentDisplayError.title")}</h1>
        <p>
          {[
            userCanSaveCopy()
              ? t("V3.app.documentDisplayError.suggestionWithSave")
              : t("V3.app.documentDisplayError.suggestion"),
            " ",
            t("V3.app.documentDisplayError.reason")
          ]}
        </p>
        <h2>{t("V3.app.documentDisplayError.detailsTitle")}</h2>
        <p>{error.message}</p>
      </div>
    )
  }, [userCanSaveCopy])

  useEffect(() => {
    const showErrorDialog = (error: ErrorEvent) => {
      const dialogMessage = [
        t("V3.app.errorDialog.description"),
        userCanSaveCopy()
          ? t("V3.app.errorDialog.suggestionWithSave")
          : t("V3.app.errorDialog.suggestion"),
        t("V3.app.errorDialog.errorDetails", {vars: [error.message]})
      ].join(" ")
      appState.alert(dialogMessage, t("V3.app.errorDialog.title"))
    }
    window.addEventListener("error", showErrorDialog)
    return () => {
      window.removeEventListener("error", showErrorDialog)
    }
  }, [userCanSaveCopy])

  return { fallbackRender }
}
