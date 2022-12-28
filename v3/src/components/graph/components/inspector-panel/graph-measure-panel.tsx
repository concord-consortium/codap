import React from "react"
import { Box, Button, Checkbox, Flex, FormControl, useToast}from "@chakra-ui/react"
import t from "../../../../utilities/translation/translate"
import { IGraphModel } from "../../models/graph-model"
import { InspectorPalette } from "../../../inspector-panel"
import ValuesIcon from "../../../../assets/icons/icon-values.svg"

import "./point-format-panel.scss"

interface IProps {
  graphModel: IGraphModel
  setShowPalette: (palette: string | undefined) => void
}

export const GraphMeasurePalette = ({graphModel, setShowPalette}: IProps) => {
  const toast = useToast()

  const measures = {
    "casePlot": [ t("DG.Inspector.graphCount")],
    "dotChart": [ t("DG.Inspector.graphCount"),
                  t("DG.Inspector.graphPercent")],
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
    "scatterPlot": [  t("DG.Inspector.graphCount"),
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

  const handleSetting = (measure: string, val: boolean) => {
    toast({
      title: 'Item clicked',
      description: `You clicked on ${measure} ${val}`,
      status: 'success',
      duration: 5000,
      isClosable: true,
    })
  }

  const paletteTop = graphModel.plotType === "casePlot" || graphModel.plotType === "dotChart"
                      ? 50
                      : 0

  return (
    <InspectorPalette
      title={t("DG.Inspector.values")}
      Icon={<ValuesIcon />}
      paletteTop={paletteTop}
      buttonLocation={graphModel.plotType === "casePlot" || graphModel.plotType === "dotChart" ? 25 : 75}
    >
      <Flex className="palette-form" direction="column">
        <Box className="form-title">Show ...</Box>
        {measures[graphModel.plotType].map((title:string) => {
           return (
            <FormControl key={title}>
              <Checkbox onChange={e => handleSetting(title, e.target.checked)}>
                {title}
              </Checkbox>
            </FormControl>
          )
        })}
        {graphModel.plotType === "dotPlot" &&
          <Button size="xs" w="120px">Movable Value</Button>}
      </Flex>
    </InspectorPalette>
  )
}
