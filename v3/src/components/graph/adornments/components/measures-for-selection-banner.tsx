import { observer } from "mobx-react-lite"
import { t } from "../../../../utilities/translation/translate"
import { useGraphDataConfigurationContext } from "../../hooks/use-graph-data-configuration-context"

import "./measures-for-selection-banner.scss"

export const MeasuresForSelectionBanner = observer(function MeasuresForSelectionBanner() {
  const dataConfig = useGraphDataConfigurationContext()
  const content = dataConfig?.selection.length === 1
                    ? t("DG.SelectedInfoView.infoSing", { vars: [1] })
                    : t("DG.SelectedInfoView.infoPlural", { vars: [dataConfig?.selection.length] })

  return (
    <div className="measures-for-selection-banner" data-testid="measures-for-selection-banner">
      {content}
    </div>
  )
})
