import { Button, Disclosure, DisclosurePanel, Heading } from "react-aria-components"
import { observer } from "mobx-react-lite"
import { ITileModel } from "../../../../models/tiles/tile-model"
import { uiState } from "../../../../models/ui-state"
import { t } from "../../../../utilities/translation/translate"
import { IGroupItem } from "../../adornments/store/adornments-store-utils"
import { GraphContentModelContext } from "../../hooks/use-graph-content-model-context"
import { GraphDataConfigurationContext } from "../../hooks/use-graph-data-configuration-context"
import { isGraphContentModel } from "../../models/graph-content-model"

import "./graph-measure-group.scss"

interface IProps {
  tile?: ITileModel
  measureGroup: IGroupItem
}

export const GraphMeasureGroup = observer(
  function GraphMeasureGroup({ tile, measureGroup }: IProps)
{
  const graphModel = isGraphContentModel(tile?.content) ? tile?.content : undefined
  if (!isGraphContentModel(graphModel)) {
    return null
  }
  const itemsAreVisible = !!measureGroup.rulerStateKey &&
    uiState.getRulerStateVisibility(measureGroup.rulerStateKey)

  const handleExpandedChange = (isExpanded: boolean) => {
    if (measureGroup.rulerStateKey) {
      if (isExpanded !== itemsAreVisible) {
        uiState.toggleRulerStateVisibility(measureGroup.rulerStateKey)
      }
    }
  }

  return (
    <Disclosure isExpanded={itemsAreVisible} onExpandedChange={handleExpandedChange}>
      <Heading level={4}>
        <Button
          slot="trigger"
          className="measure-group-button"
          data-testid={`adornment-toggle-${measureGroup.rulerStateKey}`}
        >
          <span className="disclosure-arrow" aria-hidden="true" />
          {t(measureGroup.title)}
        </Button>
      </Heading>
      <DisclosurePanel>
        <div className="measure-items">
          {measureGroup.menuItems.map(measure => {
            const { componentInfo, componentContentInfo, title } = measure
            const titleSlug = t(title).replace(/ /g, "-").toLowerCase()
            if (componentInfo && componentContentInfo) {
              return (
                <GraphContentModelContext.Provider key={`${titleSlug}-graph-model-context`} value={graphModel}>
                  <GraphDataConfigurationContext.Provider
                    key={`${titleSlug}-data-configuration-context`}
                    value={graphModel.dataConfiguration}
                  >
                    <componentInfo.Controls
                      key={titleSlug}
                      adornmentModel={componentContentInfo.modelClass}
                    />
                  </GraphDataConfigurationContext.Provider>
                </GraphContentModelContext.Provider>
              )
            }
          })}
        </div>
      </DisclosurePanel>
    </Disclosure>
  )
})
