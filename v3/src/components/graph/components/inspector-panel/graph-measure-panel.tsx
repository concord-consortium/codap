import React from "react"
import { Box, Button, Checkbox, Flex, FormControl, useToast}from "@chakra-ui/react"
import t from "../../../../utilities/translation/translate"
import { IGraphModel } from "../../models/graph-model"
import { InspectorPalette } from "../../../inspector-panel"
import ValuesIcon from "../../../../assets/icons/icon-values.svg"

import "./point-format-panel.scss"

interface IProps {
  graphModel: IGraphModel
  showMeasurePalette: boolean
  setShowMeasurePalette: (show: boolean) => void;
}

export const GraphMeasurePalette = ({graphModel, showMeasurePalette, setShowMeasurePalette}: IProps) => {
  const toast = useToast()

  const dotChartMeasures = [{
    title: t("DG.Inspector.graphPercent")
  }]
  const dotPlotMeasures = [
    {title: t("DG.Inspector.showLabels")},
    {title: t("DG.Inspector.graphPlottedMean")},
    {title: t("DG.Inspector.graphPlottedMedian")},
    {title: t("DG.Inspector.graphPlottedStDev")},
    {title: t("DG.Inspector.graphPlottedMeanAbsDev")},
    {title: t("DG.Inspector.graphPlottedBoxPlot")},
    {title: t("DG.Inspector.graphBoxPlotShowOutliers")},
    {title: t("DG.Inspector.graphPlottedValue")},
  ]
  const scatterPlotMeasures = [
    {title: t("DG.Inspector.graphConnectingLine")},
    {title: t("DG.Inspector.graphMovablePoint")},
    {title: t("DG.Inspector.graphMovableLine")},
    {title: t("DG.Inspector.graphLSRL")},
    {title: t("DG.Inspector.graphInterceptLocked")},
    {title: t("DG.Inspector.graphPlottedFunction")},
    {title: t("DG.Inspector.graphPlottedValue")},
    {title: t("DG.Inspector.graphSquares")},
  ]

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
        <FormControl>
          <Checkbox onChange={e => handleSetting(t("DG.Inspector.graphCount"), e.target.checked)}>
            {t("DG.Inspector.graphCount")}
          </Checkbox>
        </FormControl>
        {graphModel.plotType === "dotChart" &&
          dotChartMeasures.map(m => {
            return (
              <FormControl key={m.title}>
                <Checkbox onChange={e => handleSetting(m.title, e.target.checked)}>
                  {m.title}
                </Checkbox>
              </FormControl>
            )
          })
        }
        {graphModel.plotType === "dotPlot" &&
          dotPlotMeasures.map(m => {
            return (
              <FormControl key={m.title}>
                <Checkbox onChange={e => handleSetting(m.title, e.target.checked)}>
                  {m.title}
                </Checkbox>
              </FormControl>
            )
          })
        }
        {graphModel.plotType === "dotPlot" &&
          <Button size="xs" w="120px">Movable Value</Button>}
        {graphModel.plotType === "scatterPlot" &&
          scatterPlotMeasures.map(m => {
            return (
              <FormControl key={m.title}>
                <Checkbox onChange={e => handleSetting(m.title, e.target.checked)}>
                  {m.title}
                </Checkbox>
              </FormControl>
            )
          })
        }
      </Flex>
    </InspectorPalette>
  )
}
