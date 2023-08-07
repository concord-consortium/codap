import React from "react"
import { Box, Button, Checkbox, Flex, FormControl, useToast} from "@chakra-ui/react"
import t from "../../../../utilities/translation/translate"
import { ITileModel } from "../../../../models/tiles/tile-model"
import { isGraphContentModel } from "../../models/graph-content-model"
import { GraphContentModelContext } from "../../hooks/use-graph-content-model-context"
import { InspectorPalette } from "../../../inspector-panel"
import ValuesIcon from "../../../../assets/icons/icon-values.svg"
import { getAdornmentContentInfo, getAdornmentTypes } from "../../adornments/adornment-content-info"
import { getAdornmentComponentInfo } from "../../adornments/adornment-component-info"
import { DataConfigurationContext } from "../../hooks/use-data-configuration-context"

import "./point-format-panel.scss"

interface IProps {
  tile?: ITileModel
  panelRect?: DOMRect
  buttonRect?: DOMRect
  setShowPalette: (palette: string | undefined) => void
}

const registeredAdornments = getAdornmentTypes()

export const GraphMeasurePalette = ({tile, panelRect, buttonRect, setShowPalette}: IProps) => {
  const toast = useToast()
  const graphModel = isGraphContentModel(tile?.content) ? tile?.content : undefined

  const measures = {
    "casePlot": [ t("DG.Inspector.graphCount") ],
    "dotChart": [ t("DG.Inspector.graphCount") ],
    "dotPlot":  [ t("DG.Inspector.graphCount"),
                  t("DG.Inspector.showLabels"),
                  t("DG.Inspector.graphPlottedMean"),
                  t("DG.Inspector.graphPlottedMedian"),
                  t("DG.Inspector.graphPlottedStDev"),
                  t("DG.Inspector.graphPlottedMeanAbsDev"),
                  t("DG.Inspector.graphPlottedBoxPlot"),
                  t("DG.Inspector.graphBoxPlotShowOutliers"),
                  t("DG.Inspector.graphPlottedValue")
                ],
    "scatterPlot": [ t("DG.Inspector.graphCount"),
                     t("DG.Inspector.graphConnectingLine"),
                     t("DG.Inspector.graphMovablePoint"),
                     t("DG.Inspector.graphMovableLine"),
                     t("DG.Inspector.graphLSRL"),
                     t("DG.Inspector.graphInterceptLocked"),
                     t("DG.Inspector.graphPlottedFunction"),
                     t("DG.Inspector.graphPlottedValue"),
                     t("DG.Inspector.graphSquares"),
                    ]
  }

  const handleSetting = (measure: string, checked: boolean, options?: Record<string, any>) => {
    // Show toast pop-ups for adornments that haven't been implemented yet.
    // TODO: Remove this and `measures` object when all adornments are implemented.
    if (!graphModel) {
      toast({
        title: 'Item clicked',
        description: `You clicked on ${measure} ${checked}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      })
      return null
    }
  }

  return (
    <InspectorPalette
      title={t("DG.Inspector.values")}
      Icon={<ValuesIcon />}
      setShowPalette={setShowPalette}
      panelRect={panelRect}
      buttonRect={buttonRect}
    >
      <Flex className="palette-form" direction="column">
        <Box className="form-title">Show ...</Box>
        {graphModel && measures[graphModel.plotType].map((title: string) => {
          const registeredAdornment = registeredAdornments.find(a => a === title)
          if (registeredAdornment) {
            const componentInfo = getAdornmentComponentInfo(title)
            const componentContentInfo = getAdornmentContentInfo(title)
            if (componentInfo) {
              return (
                <GraphContentModelContext.Provider key={`${title}-graph-model-context`} value={graphModel}>
                  <DataConfigurationContext.Provider
                    key={`${title}-data-configuration-context`}
                    value={graphModel.dataConfiguration}
                  >
                    <componentInfo.Controls key={title} adornmentModel={componentContentInfo.modelClass} />
                  </DataConfigurationContext.Provider>
                </GraphContentModelContext.Provider>
              )
            }
          } else {
            const titleSlug = title.replace(/ /g, "-").toLowerCase()
            return (
              <FormControl key={title}>
                <Checkbox
                  data-testid={`adornment-checkbox-${titleSlug}`}
                  onChange={e => handleSetting(title, e.target.checked)}
                >
                  {title}
                </Checkbox>
              </FormControl>
            )
          }
        })}
        {graphModel?.plotType === "dotPlot" &&
          <Button size="xs" w="120px">Movable Value</Button>}
      </Flex>
    </InspectorPalette>
  )
}
