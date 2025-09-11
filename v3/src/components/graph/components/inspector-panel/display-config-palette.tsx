import { Checkbox, Box, Flex, FormLabel, Input, Radio, RadioGroup, Stack } from "@chakra-ui/react"
import {observer} from "mobx-react-lite"
import React, { useEffect } from "react"
import BarChartIcon from "../../../../assets/icons/icon-segmented-bar-chart.svg"
import { useForceUpdate } from "../../../../hooks/use-force-update"
import { logMessageWithReplacement } from "../../../../lib/log-message"
import { ITileModel } from "../../../../models/tiles/tile-model"
import { mstReaction } from "../../../../utilities/mst-reaction"
import { t } from "../../../../utilities/translation/translate"
import { tileNotification } from "../../../../models/tiles/tile-notifications"
import { isPointDisplayType } from "../../../data-display/data-display-types"
import { InspectorPalette } from "../../../inspector-panel"
import { BreakdownType, BreakdownTypes } from "../../graphing-types"
import { isGraphContentModel } from "../../models/graph-content-model"
import { isBinnedPlotModel } from "../../plots/histogram/histogram-model"
import { isBarChartModel } from "../../plots/bar-chart/bar-chart-model"

type BinOption = "binWidth" | "binAlignment"

interface IProps {
  tile?: ITileModel
  panelRect?: DOMRect
  buttonRect?: DOMRect
  setShowPalette: (palette: string | undefined) => void;
}

export const DisplayConfigPalette = observer(function DisplayConfigPanel(props: IProps) {
  const { buttonRect, panelRect, setShowPalette, tile } = props
  const graphModel = isGraphContentModel(tile?.content) ? tile?.content : undefined
  const forceUpdate = useForceUpdate()
  const binnedPlot = isBinnedPlotModel(graphModel?.plot) ? graphModel?.plot : undefined
  const barChart = isBarChartModel(graphModel?.plot) ? graphModel?.plot : undefined
  // "formula" radio button should be selected when formula editor is open
  const breakdownTypeRadio = barChart?.formulaEditorIsOpen ? "formula" : barChart?.breakdownType
  const binDetails = graphModel?.dataConfiguration
                      ? binnedPlot?.binDetails()
                      : { binWidth: undefined, binAlignment: undefined }
  const pointsFusedIntoBars = graphModel?.pointsFusedIntoBars
  const showPointDisplayType = graphModel?.plot?.showDisplayTypeSelection
  const showFuseIntoBars = graphModel?.plot?.showFusePointsIntoBars
  const showBreakdownTypes = graphModel?.plot?.showBreakdownTypes
  const showBarForEachPoint = graphModel?.plot?.isUnivariateNumeric &&
                            graphModel?.dataConfiguration.primaryAttributeType !== "date"

  const handleDisplayTypeChange = (configType: string) => {
    if (isPointDisplayType(configType) || configType === "bins") {
      const display = configType === "bars" ? "bars" : "points"
      const isBinned = configType === "bins"
      const plotType = isBinned ? "BinnedPlot"
        : (display === "bars" ? "LinePlot" : "DotPlot")
      graphModel?.applyModelChange(() => {
          graphModel?.configureUnivariateNumericPlot(display, isBinned)
        },
        {
          undoStringKey: "DG.Undo.graph.showAsBinnedPlot",
          redoStringKey: "DG.Redo.graph.showAsBinnedPlot",
          log: logMessageWithReplacement("toggleShowAs: %@", { logString: plotType }),
          notify: tile ? tileNotification(`toggle show as ${plotType}`, {}, tile) : undefined
        }
      )
      graphModel?.configureUnivariateNumericPlot(display, isBinned)
    }
  }

  const setBinOption = (option: BinOption, value: number) => {
    switch (option) {
      case "binWidth":
        binnedPlot?.setBinWidth(value)
        break
      case "binAlignment":
        binnedPlot?.setBinAlignment(value)
        break
      default:
        break
    }
  }

  const handleBinOptionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, option: BinOption) => {
    if (e.key === "Enter") {
      e.preventDefault()
      const initialValue = binnedPlot?.[option]
      const value = Number((e.target as HTMLInputElement).value)
      graphModel?.applyModelChange(() => {
        setBinOption(option, value)
      }, {
        log: logMessageWithReplacement(
                    "Changed %@ from %@ to %@",
                    { option, [`${option}Initial`]: initialValue, [option]: value }),
        undoStringKey: option === "binWidth" ? "DG.Undo.graph.changeBinWidth" : "DG.Undo.graph.changeBinAlignment",
        redoStringKey: option === "binWidth" ? "DG.Redo.graph.changeBinWidth" : "DG.Redo.graph.changeBinAlignment",
        notify: tile ? tileNotification(`change bin parameter`, {}, tile) : undefined
     })
    }
  }

  const handleBinOptionBlur = (e: React.ChangeEvent<HTMLInputElement>, option: BinOption) => {
    const initialValue = binnedPlot?.[option]
    const value = Number((e.target as HTMLInputElement).value)
    graphModel?.applyModelChange(() => {
      setBinOption(option, value)
    }, {
      log: logMessageWithReplacement(
                  "Changed %@ from %@ to %@",
                  { option, [`${option}Initial`]: initialValue, [option]: value }),
      undoStringKey: option === "binWidth" ? "DG.Undo.graph.changeBinWidth" : "DG.Undo.graph.changeBinAlignment",
      redoStringKey: option === "binWidth" ? "DG.Redo.graph.changeBinWidth" : "DG.Redo.graph.changeBinAlignment",
      notify: tile ? tileNotification(`change bin parameter`, {}, tile) : undefined
    })
  }

  const handleSetFuseIntoBars = (fuseIntoBars: boolean) => {
    const [undoStringKey, redoStringKey] = fuseIntoBars
      ? ["DG.Undo.graph.fuseDotsToRectangles", "DG.Redo.graph.fuseDotsToRectangles"]
      : ["DG.Undo.graph.dissolveRectanglesToDots", "DG.Redo.graph.dissolveRectanglesToDots"]

    graphModel?.applyModelChange(() => {
        graphModel?.fusePointsIntoBars(fuseIntoBars)
        graphModel?.pointDescription.setPointStrokeSameAsFill(fuseIntoBars)
      },
      { undoStringKey, redoStringKey,
        log: logMessageWithReplacement("toggleShowAs: %@", { type: fuseIntoBars ? "BarChart" : "DotChart" }),
        notify: tile ? tileNotification(`toggle between bars and dots`, {}, tile) : undefined
      }
    )
  }

  const handleBreakdownTypeChange = (breakdownType: BreakdownType) => {
    if (breakdownType === "formula") {
      barChart?.setFormulaEditorIsOpen(true)
    } else {
      barChart?.applyModelChange(() => barChart?.setBreakdownType(breakdownType), {
        log: logMessageWithReplacement(
          "Changed %@ from %@ to %@",
          {option: "breakdownType", [`breakdownTypeInitial`]: barChart?.breakdownType, breakdownType}),
        undoStringKey: "DG.Undo.graph.changeBreakdownType",
        redoStringKey: "DG.Redo.graph.changeBreakdownType",
        notify: tile ? tileNotification(
          `change bar chart from ${barChart?.breakdownType} to ${breakdownType}`, {}, tile) : undefined
      })
    }
  }

  useEffect(() => {
    mstReaction(
      () => barChart?.formulaEditorIsOpen,
      () => forceUpdate(),
      {name: "formulaEditorIsOpen"}, barChart)
  }, [barChart, forceUpdate])

  return (
    <InspectorPalette
      title={t("DG.Inspector.configuration")}
      Icon={<BarChartIcon/>}
      setShowPalette={setShowPalette}
      panelRect={panelRect}
      buttonRect={buttonRect}
    >
      <Flex className="palette-form" direction="column">
        {showPointDisplayType && (
          <RadioGroup defaultValue={graphModel?.plot.isBinned ? "bins" : graphModel?.plot.displayType}>
            <Stack>
              <Radio
                size="md"
                value="points"
                data-testid="points-radio-button"
                onChange={(e) => handleDisplayTypeChange(e.target.value)}
              >
                {t("DG.Inspector.graphPlotPoints")}
              </Radio>
              <Radio
                size="md"
                value="bins"
                data-testid="bins-radio-button"
                onChange={(e) => handleDisplayTypeChange(e.target.value)}
              >
                {t("DG.Inspector.graphGroupIntoBins")}
              </Radio>
              {showBarForEachPoint &&
                <Radio
                    size="md"
                    value="bars"
                    data-testid="bars-radio-button"
                    onChange={(e) => handleDisplayTypeChange(e.target.value)}
                >
                  {t("DG.Inspector.graphBarForEachPoint")}
                </Radio>}
            </Stack>
          </RadioGroup>
        )}
        {showPointDisplayType && graphModel?.plot.isBinned && (
          <Stack>
            <Box className="inline-input-group" data-testid="graph-bin-width-setting">
              <FormLabel className="form-label">
                {t("DG.Inspector.graphBinWidth")}
              </FormLabel>
              {/* TODO: Make it so this field updates instantly to the appropriate value if the user-entered
                  value would result in a pixel width for bins that's smaller than the minimum allowed pixel
                  width. Currently, enforcing of the min pixel width is handled by the enforceMinBinPixelWidth
                  useEffect in BinnedDotPlotDots. */}
              <Input
                className="form-input"
                type="number"
                defaultValue={binDetails?.binWidth}
                onBlur={(e) => handleBinOptionBlur(e, "binWidth")}
                onKeyDown={(e) => handleBinOptionKeyDown(e, "binWidth")}
              />
            </Box>
            <Box className="inline-input-group" data-testid="graph-bin-alignment-setting">
              <FormLabel className="form-label">
                {t("DG.Inspector.graphAlignment")}
              </FormLabel>
              <Input
                className="form-input"
                type="number"
                defaultValue={binDetails?.binAlignment}
                onBlur={(e) => handleBinOptionBlur(e, "binAlignment")}
                onKeyDown={(e) => handleBinOptionKeyDown(e, "binAlignment")}
              />
            </Box>
          </Stack>
        )}
      {showFuseIntoBars && (
        <Stack>
          <Checkbox
            data-testid="bar-chart-checkbox"
            mt="6px" isChecked={pointsFusedIntoBars}
            onChange={e => handleSetFuseIntoBars(e.target.checked)}
          >
            {t("DG.Inspector.graphBarChart")}
          </Checkbox>
          {showBreakdownTypes && (
            <Stack>
              <Box className="form-title">{t("DG.Inspector.displayShow")}</Box>
              <RadioGroup value={breakdownTypeRadio}>
                <Stack>
                  {BreakdownTypes.map((type) => {
                    return (
                      <Radio
                        key={type}
                        size="md"
                        value={type}
                        data-testid={`${type}-radio-button`}
                        onChange={(e) => {
                          const value = e.target.value as BreakdownType
                          handleBreakdownTypeChange(value)
                        }}
                      >
                        {t(`DG.Inspector.graph${type.charAt(0).toUpperCase() + type.slice(1)}`)}
                      </Radio>
                    )
                  })
                  }
                </Stack>
              </RadioGroup>
            </Stack>
          )}
        </Stack>
       )}
      </Flex>
    </InspectorPalette>
  )
})
