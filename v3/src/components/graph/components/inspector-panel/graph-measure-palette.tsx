import { observer } from "mobx-react-lite"
import MeasureIcon from "../../../../assets/icons/inspector-panel/data-icon.svg"
import { ITileModel } from "../../../../models/tiles/tile-model"
import { getDocumentContentPropertyFromNode } from "../../../../utilities/mst-utils"
import { t } from "../../../../utilities/translation/translate"
import { InspectorPalette } from "../../../inspector-panel"
import { PaletteCheckbox } from "../../../palette-checkbox"
import { isGroupItem, isMeasureMenuItem } from "../../adornments/store/adornments-store-utils"
import { GraphContentModelContext } from "../../hooks/use-graph-content-model-context"
import { GraphDataConfigurationContext } from "../../hooks/use-graph-data-configuration-context"
import { isGraphContentModel } from "../../models/graph-content-model"
import { GraphMeasureGroup } from "./graph-measure-group"

import "./graph-measure-palette.scss"

interface IProps {
  id?: string
  tile?: ITileModel
  panelRect?: DOMRect
  buttonRect?: DOMRect
  setShowPalette: (palette: string | undefined) => void
}

export const GraphMeasurePalette = observer(function GraphMeasurePalette({
  id, tile, panelRect, buttonRect, setShowPalette
}: IProps) {
  const graphModel = isGraphContentModel(tile?.content) ? tile.content : undefined
  const useGaussianOptions = graphModel?.plotType === "histogram" &&
    getDocumentContentPropertyFromNode(graphModel, "gaussianFitEnabled")
  const measures =
    graphModel?.adornmentsStore.getAdornmentsMenuItems(tile, graphModel.plotType, useGaussianOptions)

  return (
    <InspectorPalette
      id={id}
      title={t("DG.Inspector.values")}
      Icon={<MeasureIcon />}
      setShowPalette={setShowPalette}
      panelRect={panelRect}
      buttonRect={buttonRect}
      tileType="graph"
    >
      <div className="palette-form graph-measure-palette">
        {graphModel && measures?.map(measureOrGroup => {
          if (isGroupItem(measureOrGroup)) {
            return (
              <GraphMeasureGroup
                key={measureOrGroup.title}
                tile={tile}
                measureGroup={measureOrGroup}
              />
            )
          } else if (isMeasureMenuItem(measureOrGroup)) {
            const {
              checked,
              clickHandler,
              componentInfo,
              componentContentInfo,
              disabled, title
            } = measureOrGroup
            const titleSlug = t(title).replace(/ /g, "-").toLowerCase()
            // Derive a stable kebab-case slug from the i18n key (not the translated label)
            // so the data-testid stays locale-independent.
            const keyTail = title.split(".").pop() ?? title
            const stableSlug = keyTail
              .replace(/([a-z])([A-Z])/g, "$1-$2")
              .replace(/[^a-zA-Z0-9]+/g, "-")
              .toLowerCase()
              .replace(/^-+|-+$/g, "")
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
            } else {
              return (
                <PaletteCheckbox
                  key={titleSlug}
                  data-testid={`adornment-checkbox-${stableSlug}`}
                  isSelected={checked}
                  isDisabled={!!disabled}
                  onChange={clickHandler}
                >
                  {t(title)}
                </PaletteCheckbox>
              )
            }
          }
        })}
      </div>
    </InspectorPalette>
  )
})
