import { Checkbox, Box, Flex, FormLabel, Input, Radio, RadioGroup, Stack } from "@chakra-ui/react"
import {observer} from "mobx-react-lite"
import React from "react"
import BarChartIcon from "../../../../assets/icons/icon-segmented-bar-chart.svg"
import { logMessageWithReplacement } from "../../../../lib/log-message"
import { ITileModel } from "../../../../models/tiles/tile-model"
import { t } from "../../../../utilities/translation/translate"
import { isPointDisplayType } from "../../../data-display/data-display-types"
import { InspectorPalette } from "../../../inspector-panel"
import { isGraphContentModel } from "../../models/graph-content-model"
import { isBinnedPlotModel } from "../../plots/histogram/histogram-model"

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
  const binnedPlot = isBinnedPlotModel(graphModel?.plot) ? graphModel?.plot : undefined
  const binDetails = graphModel?.dataConfiguration
                      ? binnedPlot?.binDetails()
                      : { binWidth: undefined, binAlignment: undefined }
  const pointsFusedIntoBars = graphModel?.pointsFusedIntoBars
  const showPointDisplayType = graphModel?.plot?.showDisplayTypeSelection
  const showFuseIntoBars = graphModel?.plot?.showFusePointsIntoBars
  const showBarForEachPoint = graphModel?.plot?.isUnivariateNumeric &&
                            graphModel?.dataConfiguration.primaryAttributeType !== "date"

  const handleDisplayTypeChange = (configType: string) => {
    if (isPointDisplayType(configType) || configType === "bins") {
      const display = configType === "bars" ? "bars" : "points"
      const isBinned = configType === "bins"
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
        redoStringKey: option === "binWidth" ? "DG.Redo.graph.changeBinWidth" : "DG.Redo.graph.changeBinAlignment"
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
      redoStringKey: option === "binWidth" ? "DG.Redo.graph.changeBinWidth" : "DG.Redo.graph.changeBinAlignment"
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
        log: logMessageWithReplacement("toggleShowAs: %@", { type: fuseIntoBars ? "BarChart" : "DotChart" })
      }
    )
  }

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
      {showFuseIntoBars &&
          <Checkbox
            data-testid="bar-chart-checkbox"
            mt="6px" isChecked={pointsFusedIntoBars}
            onChange={e => handleSetFuseIntoBars(e.target.checked)}
          >
            {t("DG.Inspector.graphBarChart")}
          </Checkbox>
       }
      </Flex>
    </InspectorPalette>
  )
})
