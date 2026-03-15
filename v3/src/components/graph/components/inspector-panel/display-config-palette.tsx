import { clsx } from "clsx"
import { Input, Label, Radio, RadioGroup, TextField } from "react-aria-components"
import {observer} from "mobx-react-lite"
import React, { useEffect, useRef, useState } from "react"
import ConfigurationIcon from "../../../../assets/icons/inspector-panel/configuration-icon.svg"
import { useForceUpdate } from "../../../../hooks/use-force-update"
import { logMessageWithReplacement } from "../../../../lib/log-message"
import { ITileModel } from "../../../../models/tiles/tile-model"
import { mstReaction } from "../../../../utilities/mst-reaction"
import { t } from "../../../../utilities/translation/translate"
import { tileNotification } from "../../../../models/tiles/tile-notifications"
import { If } from "../../../common/if"
import { isPointDisplayType } from "../../../data-display/data-display-types"
import { InspectorPalette } from "../../../inspector-panel"
import { PaletteCheckbox } from "../../../palette-checkbox"
import { BreakdownType, BreakdownTypes } from "../../graphing-types"
import { isGraphContentModel } from "../../models/graph-content-model"
import { isBinnedPlotModel } from "../../plots/histogram/histogram-model"
import { isBarChartModel } from "../../plots/bar-chart/bar-chart-model"

import "./display-config-palette.scss"

interface IFusePointsControlsProps {
  pointsFusedIntoBars?: boolean
  showBreakdownTypes?: boolean
  breakdownTypeRadio?: string
  onFuseChange: (fuseIntoBars: boolean) => void
  onBreakdownTypeChange: (breakdownType: BreakdownType) => void
}

const FusePointsControls = observer(function FusePointsControls({
  pointsFusedIntoBars, showBreakdownTypes, breakdownTypeRadio,
  onFuseChange, onBreakdownTypeChange
}: IFusePointsControlsProps) {
  return (
    <>
      <PaletteCheckbox
        data-testid="bar-chart-checkbox"
        isSelected={pointsFusedIntoBars}
        onChange={onFuseChange}
      >
        {t("DG.Inspector.graphBarChart")}
      </PaletteCheckbox>
      <If condition={!!showBreakdownTypes}>
        <div className="sub-options">
          <RadioGroup
            aria-label={t("DG.Inspector.displayShow")}
            value={breakdownTypeRadio}
            onChange={(value) => onBreakdownTypeChange(value as BreakdownType)}
          >
            {BreakdownTypes.map((type) => (
              <Radio
                key={type}
                value={type}
                data-testid={`${type}-radio-button`}
              >
                {({isSelected}) => (
                  <>
                    <span className={clsx("radio-indicator", { selected: isSelected })} />
                    {t(`DG.Inspector.graph${type.charAt(0).toUpperCase() + type.slice(1)}`)}
                  </>
                )}
              </Radio>
            ))}
          </RadioGroup>
        </div>
      </If>
    </>
  )
})

type BinOption = "binWidth" | "binAlignment"

interface IProps {
  id?: string
  tile?: ITileModel
  panelRect?: DOMRect
  buttonRect?: DOMRect
  setShowPalette: (palette: string | undefined) => void;
}

export const DisplayConfigPalette = observer(function DisplayConfigPanel(props: IProps) {
  const { buttonRect, id, panelRect, setShowPalette, tile } = props
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
  const kInputMaxCharacters = 12
  const kBufferChars = 2 // used to account for input field padding
  const [binWidthInput, setBinWidthInput] = useState(String(binDetails?.binWidth))
  const [binAlignmentInput, setBinAlignmentInput] = useState(String(binDetails?.binAlignment))
  const binWidthInputRef = useRef<HTMLInputElement>(null)

  const handleDisplayTypeChange = (configType: string) => {
    if (isPointDisplayType(configType) || configType === "bins") {
      const display = configType === "bars" ? "bars" : "points"
      const isBinned = configType === "bins"
      const plotType = isBinned ? "BinnedPlot"
        : (display === "bars" ? "LinePlot" : "DotPlot")
      let undoStringKey = ""
      let redoStringKey = ""
      switch (isBinned) {
        case true:
          undoStringKey = "DG.Undo.graph.showAsBinnedPlot"
          redoStringKey = "DG.Redo.graph.showAsBinnedPlot"
          break
        case false:
          if (display === "points") {
            undoStringKey = "DG.Undo.graph.showAsDotPlot"
            redoStringKey = "DG.Redo.graph.showAsDotPlot"
          } else {
            undoStringKey = "DG.Undo.graph.showAsLinePlot"
            redoStringKey = "DG.Redo.graph.showAsLinePlot"
          }
          break
      }
      graphModel?.applyModelChange(() => {
          graphModel?.configureUnivariateNumericPlot(display, isBinned)
        },
        {
          undoStringKey, redoStringKey,
          log: logMessageWithReplacement("toggleShowAs: %@", { logString: plotType }),
          notify: tile ? tileNotification(`toggle show as ${plotType}`, {}, tile) : undefined
        }
      )
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

  const filterNumericInput = (value: string): string => {
    // Remove characters that are not digits or a decimal point.
    let filteredValue = value.replace(/[^0-9.]/g, "")
    // Only allow one decimal point.
    const parts = filteredValue.split('.')
    if (parts.length > 2) {
      filteredValue = `${parts.shift()}.${parts.join('')}`
    }
    return filteredValue
  }

  const handleBinWidthInput = (value: string) => {
    setBinWidthInput(filterNumericInput(value))
  }

  const handleBinAlignmentInput = (value: string) => {
    setBinAlignmentInput(filterNumericInput(value))
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
    } else {
      // Limit the number of characters that can be entered, but allow deletion and navigation keys, and
      // overwriting if the user has selected characters they intend to change.
      const allowedKeys = new Set([ "Backspace", "Delete", "ArrowLeft", "ArrowRight", "Home", "End", "Tab" ])
      const isModifierKeyPressed = e.ctrlKey || e.metaKey
      const isAllowedKey = allowedKeys.has(e.key) || isModifierKeyPressed
      const hasSelection = e.currentTarget.selectionStart !== e.currentTarget.selectionEnd

      if (e.currentTarget.value.length >= kInputMaxCharacters && !isAllowedKey && !hasSelection) {
        e.preventDefault()
      }
    }
  }

  const handleBinOptionBlur = (e: React.FocusEvent<HTMLInputElement>, option: BinOption) => {
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

  useEffect(() => {
    setBinWidthInput(String(binDetails?.binWidth))
    setBinAlignmentInput(String(binDetails?.binAlignment))
  }, [binDetails?.binWidth, binDetails?.binAlignment])

  const plotIsBinned = !!graphModel?.plot.isBinned
  useEffect(() => {
    if (plotIsBinned) {
      // Use requestAnimationFrame to wait for the bin settings to render,
      // then a second frame to ensure focus doesn't reset the selection
      requestAnimationFrame(() => {
        binWidthInputRef.current?.focus()
        requestAnimationFrame(() => {
          binWidthInputRef.current?.select()
        })
      })
    }
  }, [plotIsBinned])

  return (
    <InspectorPalette
      id={id}
      title={t("DG.Inspector.configuration")}
      Icon={<ConfigurationIcon/>}
      setShowPalette={setShowPalette}
      panelRect={panelRect}
      buttonRect={buttonRect}
    >
      <div className="palette-form display-config-palette">
        <If condition={!!showPointDisplayType}>
          <RadioGroup
            aria-label={t("DG.Inspector.displayConfigType")}
            value={graphModel?.plot.isBinned ? "bins" : graphModel?.plot.displayType}
            onChange={handleDisplayTypeChange}
          >
            <Radio value="points" data-testid="points-radio-button">
              {({isSelected}) => (
                <>
                  <span className={clsx("radio-indicator", { selected: isSelected })} />
                  {t("DG.Inspector.graphPlotPoints")}
                </>
              )}
            </Radio>
            <Radio value="bins" data-testid="bins-radio-button">
              {({isSelected}) => (
                <>
                  <span className={clsx("radio-indicator", { selected: isSelected })} />
                  {t("DG.Inspector.graphGroupIntoBins")}
                </>
              )}
            </Radio>
            <If condition={!!graphModel?.plot.isBinned}>
              <div className="config-section indented">
                <div className="inline-input-group" data-testid="graph-bin-width-setting">
                  <TextField value={binWidthInput} onChange={handleBinWidthInput}>
                    <Label className="form-label">
                      {t("DG.Inspector.graphBinWidth")}
                    </Label>
                    {/* TODO: Make it so this field updates instantly to the appropriate value if the
                        user-entered value would result in a pixel width for bins that's smaller than
                        the minimum allowed pixel width. Currently, enforcing of the min pixel width is
                        handled by the enforceMinBinPixelWidth useEffect in BinnedDotPlotDots. */}
                    <Input
                      ref={binWidthInputRef}
                      className="form-input"
                      style={{width: `${binWidthInput.length + kBufferChars}ch`}}
                      onBlur={(e) => handleBinOptionBlur(e, "binWidth")}
                      onKeyDown={(e) => handleBinOptionKeyDown(e, "binWidth")}
                    />
                  </TextField>
                </div>
                <div className="inline-input-group" data-testid="graph-bin-alignment-setting">
                  <TextField value={binAlignmentInput} onChange={handleBinAlignmentInput}>
                    <Label className="form-label">
                      {t("DG.Inspector.graphAlignment")}
                    </Label>
                    <Input
                      className="form-input"
                      style={{width: `${binAlignmentInput.length + kBufferChars}ch`}}
                      onBlur={(e) => handleBinOptionBlur(e, "binAlignment")}
                      onKeyDown={(e) => handleBinOptionKeyDown(e, "binAlignment")}
                    />
                  </TextField>
                </div>
              </div>
            </If>
            <If condition={!!showFuseIntoBars}>
              <div className="fuse-points-section">
                <FusePointsControls
                  pointsFusedIntoBars={pointsFusedIntoBars}
                  showBreakdownTypes={showBreakdownTypes}
                  breakdownTypeRadio={breakdownTypeRadio}
                  onFuseChange={handleSetFuseIntoBars}
                  onBreakdownTypeChange={handleBreakdownTypeChange}
                />
              </div>
            </If>
            <If condition={!!showBarForEachPoint}>
              <Radio value="bars" data-testid="bars-radio-button">
                {({isSelected}) => (
                  <>
                    <span className={clsx("radio-indicator", { selected: isSelected })} />
                    {t("DG.Inspector.graphBarForEachPoint")}
                  </>
                )}
              </Radio>
            </If>
          </RadioGroup>
        </If>
        <If condition={!showPointDisplayType && !!showFuseIntoBars}>
          <FusePointsControls
            pointsFusedIntoBars={pointsFusedIntoBars}
            showBreakdownTypes={showBreakdownTypes}
            breakdownTypeRadio={breakdownTypeRadio}
            onFuseChange={handleSetFuseIntoBars}
            onBreakdownTypeChange={handleBreakdownTypeChange}
          />
        </If>
      </div>
    </InspectorPalette>
  )
})
