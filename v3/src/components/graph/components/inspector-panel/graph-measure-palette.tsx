import { Box, Checkbox, Flex, FormControl } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import ValuesIcon from "../../../../assets/icons/icon-values.svg"
import { ITileModel } from "../../../../models/tiles/tile-model"
import { getDocumentContentPropertyFromNode } from "../../../../utilities/mst-utils"
import { t } from "../../../../utilities/translation/translate"
import { InspectorPalette } from "../../../inspector-panel"
import { isGroupItem, isMeasureMenuItem } from "../../adornments/store/adornments-store-utils"
import { GraphContentModelContext } from "../../hooks/use-graph-content-model-context"
import { GraphDataConfigurationContext } from "../../hooks/use-graph-data-configuration-context"
import { isGraphContentModel } from "../../models/graph-content-model"
import { GraphMeasureGroup } from "./graph-measure-group"

interface IProps {
  tile?: ITileModel
  panelRect?: DOMRect
  buttonRect?: DOMRect
  setShowPalette: (palette: string | undefined) => void
}

export const GraphMeasurePalette = observer(function GraphMeasurePalette({
  tile, panelRect, buttonRect, setShowPalette
}: IProps) {
  const graphModel = isGraphContentModel(tile?.content) ? tile.content : undefined
  const useGaussianOptions = graphModel?.plotType === "histogram" &&
    getDocumentContentPropertyFromNode(graphModel, "gaussianFitEnabled")
  const measures =
    graphModel?.adornmentsStore.getAdornmentsMenuItems(tile, graphModel.plotType, useGaussianOptions)

  return (
    <InspectorPalette
      title={t("DG.Inspector.values")}
      Icon={<ValuesIcon />}
      setShowPalette={setShowPalette}
      panelRect={panelRect}
      buttonRect={buttonRect}
    >
      <Flex className="palette-form" direction="column">
        <Box className="form-title">{t("DG.Inspector.displayShow")}</Box>
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
                <FormControl key={titleSlug}>
                  <Checkbox
                    data-testid={`adornment-checkbox-${titleSlug}`}
                    defaultChecked={checked}
                    isDisabled={!!disabled}
                    onChange={clickHandler}
                  >
                    {t(title)}
                  </Checkbox>
                </FormControl>
              )
            }
          }
        })}
      </Flex>
    </InspectorPalette>
  )
})
