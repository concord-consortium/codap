import { extent } from "d3"
import { observer } from "mobx-react-lite"
import React, { useEffect, useRef, useState } from "react"
import {
  Button, Input, Label, ListBox, ListBoxItem, Popover, Select, SelectValue, TextField
} from "react-aria-components"
import { useTileModelContext } from "../../../hooks/use-tile-model-context"
import { AttributeBinningTypes, AttributeBinningType } from "../../../models/shared/data-set-metadata"
import {
  kDefaultHighAttributeColor, kDefaultLowAttributeColor
} from "../../../models/shared/data-set-metadata-constants"
import { t } from "../../../utilities/translation/translate"
import { PaletteCheckbox } from "../../palette-checkbox"
import {
  changeAttributeColorNotification, changePointColorAndAlphaNotification, changePointColorNotification
} from "../data-display-notifications"
import { IDataConfigurationModel } from "../models/data-configuration-model"
import { IDisplayItemDescriptionModel } from "../models/display-item-description-model"
import { PointColorSetting } from "./point-color-setting"

interface ILegendColorControlsProps {
  dataConfiguration: IDataConfigurationModel
  displayItemDescription: IDisplayItemDescriptionModel
}

export const LegendColorControls = observer(function LegendColorControls(
  { dataConfiguration, displayItemDescription }: ILegendColorControlsProps
) {
  const { tile } = useTileModelContext()
  const legendAttrID = dataConfiguration.attributeID("legend")
  const attrType = dataConfiguration.attributeType("legend")
  const categoriesRef = useRef<string[] | undefined>()
  categoriesRef.current = dataConfiguration?.categoryArrayForAttrRole("legend")
  const metadata = dataConfiguration.metadata
  const colorRange = metadata?.getAttributeColorRange(legendAttrID)

  const handlePointColorChange = (color: string) => {
    displayItemDescription.applyModelChange(() => {
      displayItemDescription.setPointColor(color)
    }, {
      notify: () => changePointColorAndAlphaNotification(tile, color),
      undoStringKey: "DG.Undo.graph.changePointColor",
      redoStringKey: "DG.Redo.graph.changePointColor",
      log: attrType === "categorical" ? "Changed categorical point color" : "Changed point color"
    })
  }

  const handleCatPointColorChange = (color: string, cat: string) => {
    dataConfiguration.applyModelChange(
      () => dataConfiguration.setLegendColorForCategory(cat, color),
      {
        notify: () => changePointColorNotification(tile, color, cat),
        undoStringKey: "DG.Undo.graph.changePointColor",
        redoStringKey: "DG.Redo.graph.changePointColor",
        log: "Changed categorical point color"
      }
    )
  }

  const handleLowAttributeColorChange = (color: string) => {
    metadata?.applyModelChange(() => {
      metadata.setAttributeColor(legendAttrID, color, "low")
    }, {
      notify: () => changeAttributeColorNotification(tile, color, "low"),
      undoStringKey: "DG.Undo.graph.changeAttributeColor",
      redoStringKey: "DG.Redo.graph.changeAttributeColor",
      log: "Changed attribute color"
    })
  }

  const handleHighAttributeColorChange = (color: string) => {
    metadata?.applyModelChange(() => {
      metadata.setAttributeColor(legendAttrID, color, "high")
    }, {
      notify: () => changeAttributeColorNotification(tile, color, "high"),
      undoStringKey: "DG.Undo.graph.changeAttributeColor",
      redoStringKey: "DG.Redo.graph.changeAttributeColor",
      log: "Changed attribute color"
    })
  }

  const handleLockQuantilesChange = (areLocked: boolean) => {
    const prefix = areLocked ? "lock" : "unlock"
    dataConfiguration.applyModelChange(
      () => dataConfiguration.setLegendQuantilesAreLocked(areLocked),
      {
        undoStringKey: `DG.Undo.legend.${prefix}Quantiles`,
        redoStringKey: `DG.Redo.legend.${prefix}Quantiles`,
        log: `Set legend quantiles to be ${prefix}ed`
      }
    )
  }

  if (attrType === "categorical") {
    return (
      <CategoricalColorControls
        categories={categoriesRef.current}
        dataConfiguration={dataConfiguration}
        onCatPointColorChange={handleCatPointColorChange}
      />
    )
  }

  if (attrType === "numeric") {
    return (
      <>
        <div className="num-color-setting">
          <div className="palette-row color-picker-row">
            <label className="form-label color-picker">{t("DG.Inspector.legendColor")}</label>
            <PointColorSetting
              propertyLabel={t("DG.Inspector.legendColorLow")}
              onColorChange={(color) => handleLowAttributeColorChange(color)}
              swatchBackgroundColor={colorRange?.low ?? kDefaultLowAttributeColor}
            />
            <PointColorSetting
              propertyLabel={t("DG.Inspector.legendColorHigh")}
              onColorChange={(color) => handleHighAttributeColorChange(color)}
              swatchBackgroundColor={colorRange?.high ?? kDefaultHighAttributeColor}
            />
          </div>
        </div>
        <PaletteCheckbox
          data-testid="lock-legend-quantiles-checkbox"
          isSelected={dataConfiguration.legendQuantilesAreLocked}
          onChange={handleLockQuantilesChange}
        >
          {t("DG.Inspector.lockLegendQuantiles")}
        </PaletteCheckbox>
      </>
    )
  }

  if (attrType === "color") return null

  return (
    <div className="palette-row color-picker-row">
      <label className="form-label color-picker">{t("DG.Inspector.color")}</label>
      <PointColorSetting propertyLabel={t("DG.Inspector.color")}
                        onColorChange={(color) => handlePointColorChange(color)}
                        swatchBackgroundColor={displayItemDescription.pointColor}/>
    </div>
  )
})

interface ICategoricalColorControlsProps {
  categories?: string[]
  dataConfiguration: IDataConfigurationModel
  onCatPointColorChange: (color: string, cat: string) => void
}

const CategoricalColorControls = observer(function CategoricalColorControls(
  { categories, dataConfiguration, onCatPointColorChange }: ICategoricalColorControlsProps
) {
  const [scrollVersion, setScrollVersion] = useState(0)

  const handleScroll = () => {
    setScrollVersion(v => v + 1)
  }

  return (
    <div className="cat-color-setting" onScroll={handleScroll}>
      {categories?.map(category => (
        <div key={category} className="palette-row color-picker-row cat-color-picker">
          <label className="form-label color-picker">{category}</label>
          <PointColorSetting key={category} propertyLabel={category}
            closeTrigger={scrollVersion}
            onColorChange={(color) => onCatPointColorChange(color, category)}
            swatchBackgroundColor={dataConfiguration.getLegendColorForCategory(category)}/>
        </div>
      ))}
    </div>
  )
})

interface ILegendBinsSelectProps {
  dataConfiguration: IDataConfigurationModel
}

export const LegendBinsSelect = observer(function LegendBinsSelect(
  { dataConfiguration }: ILegendBinsSelectProps
) {
  const legendAttrID = dataConfiguration.attributeID("legend")
  const metadata = dataConfiguration.metadata
  const binningType = metadata?.getAttributeBinningType(legendAttrID)

  const handleAttributeBinningTypeChange = (key: React.Key | null) => {
    if (key == null) return
    const selected = key as AttributeBinningType
    metadata?.applyModelChange(() => {
      metadata.setAttributeBinningType(legendAttrID, selected)
    }, {
      undoStringKey: "V3.Undo.graph.changeAttributeBinningType",
      redoStringKey: "V3.Redo.graph.changeAttributeBinningType",
      log: "Changed attribute binning type"
    })
  }

  return (
    <div className="legend-bins-row">
      <label className="form-label legend-bins-menu">{t("V3.Inspector.graph.legendBins")}</label>
      <Select
        aria-label={t("V3.Inspector.graph.legendBins")}
        value={binningType}
        onChange={handleAttributeBinningTypeChange}
        data-testid="legend-bins-type-select"
      >
        <Button>
          <SelectValue />
          <span aria-hidden="true" className="select-arrow">▾</span>
        </Button>
        <Popover>
          <ListBox>
            {AttributeBinningTypes.map(_binningType =>
              <ListBoxItem key={_binningType} id={_binningType}>
                {t(`V3.Inspector.graph.legendBins.${_binningType}`)}
              </ListBoxItem>
            )}
          </ListBox>
        </Popover>
      </Select>
    </div>
  )
})

const kLegendRangeMaxCharacters = 12
const kLegendRangeBufferChars = 2 // accounts for input field padding

// Strips floating-point noise (e.g. 0.30000000000000004 -> "0.3") while preserving
// integers and ordinary decimals.
function formatLegendBound(value?: number) {
  return value == null ? "" : String(parseFloat(value.toPrecision(10)))
}

// Allows an optional leading minus, digits, and a single decimal point.
function filterLegendRangeInput(value: string): string {
  let filtered = value.replace(/[^0-9.-]/g, "")
  const isNegative = filtered.startsWith("-")
  filtered = filtered.replace(/-/g, "")
  const parts = filtered.split(".")
  if (parts.length > 2) {
    filtered = `${parts.shift()}.${parts.join("")}`
  }
  return isNegative ? `-${filtered}` : filtered
}

type LegendBound = "min" | "max"

interface ILegendRangeInputsProps {
  dataConfiguration: IDataConfigurationModel
}

export const LegendRangeInputs = observer(function LegendRangeInputs(
  { dataConfiguration }: ILegendRangeInputsProps
) {
  const legendAttrID = dataConfiguration.attributeID("legend")
  const metadata = dataConfiguration.metadata
  const { min: overrideMin, max: overrideMax } = metadata?.getAttributeLegendRange(legendAttrID) ?? {}
  const [dataMin, dataMax] = extent(dataConfiguration.numericValuesForAttrRole("legend") ?? [])
  const effectiveMin = overrideMin ?? dataMin
  const effectiveMax = overrideMax ?? dataMax
  const displayMin = formatLegendBound(effectiveMin)
  const displayMax = formatLegendBound(effectiveMax)

  const [minInput, setMinInput] = useState(displayMin)
  const [maxInput, setMaxInput] = useState(displayMax)

  // Sync local state when the committed/displayed value changes (e.g. undo/redo, or a
  // live data extent change while no override is in effect).
  useEffect(() => setMinInput(displayMin), [displayMin])
  useEffect(() => setMaxInput(displayMax), [displayMax])

  const revert = (bound: LegendBound) => {
    if (bound === "min") setMinInput(displayMin)
    else setMaxInput(displayMax)
  }

  const commit = (bound: LegendBound, rawText: string) => {
    const text = rawText.trim()
    const setBound = (boundValue?: number) => {
      if (bound === "min") metadata?.setAttributeLegendMin(legendAttrID, boundValue)
      else metadata?.setAttributeLegendMax(legendAttrID, boundValue)
    }
    if (text === "") {
      // Clearing reverts this bound to the live data extent. If that leaves the *other*
      // override orphaned (it no longer brackets the data, so the range would go reversed),
      // clear it too so the displayed range and the legend never show min > max.
      const otherOverride = bound === "min" ? overrideMax : overrideMin
      const revertedDataBound = bound === "min" ? dataMin : dataMax
      const otherOrphaned = otherOverride != null && revertedDataBound != null &&
        (bound === "min" ? otherOverride <= revertedDataBound : otherOverride >= revertedDataBound)
      // Clearing always succeeds, reverting that bound to the live data extent.
      metadata?.applyModelChange(() => {
        setBound(undefined)
        if (otherOrphaned) {
          if (bound === "min") metadata.setAttributeLegendMax(legendAttrID, undefined)
          else metadata.setAttributeLegendMin(legendAttrID, undefined)
        }
      }, {
        undoStringKey: bound === "min" ? "V3.Undo.legend.clearLegendMin" : "V3.Undo.legend.clearLegendMax",
        redoStringKey: bound === "min" ? "V3.Redo.legend.clearLegendMin" : "V3.Redo.legend.clearLegendMax",
        log: bound === "min" ? "Clear legend min" : "Clear legend max"
      })
      return
    }
    const value = Number(text)
    // Validate a typed value against the other effective bound; invalid values silently revert.
    const other = bound === "min" ? effectiveMax : effectiveMin
    const valid = Number.isFinite(value) &&
      (other == null || (bound === "min" ? value < other : value > other))
    if (!valid) {
      revert(bound)
      return
    }
    metadata?.applyModelChange(() => setBound(value), {
      undoStringKey: bound === "min" ? "V3.Undo.legend.setLegendMin" : "V3.Undo.legend.setLegendMax",
      redoStringKey: bound === "min" ? "V3.Redo.legend.setLegendMin" : "V3.Redo.legend.setLegendMax",
      log: bound === "min" ? "Set legend min" : "Set legend max"
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, bound: LegendBound) => {
    if (e.key === "Enter") {
      e.preventDefault()
      commit(bound, e.currentTarget.value)
    } else if (e.key === "Escape") {
      e.preventDefault()
      revert(bound)
    } else {
      // Cap the number of characters, but allow deletion/navigation keys and overwriting a selection.
      const allowedKeys = new Set(["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Home", "End", "Tab"])
      const isAllowedKey = allowedKeys.has(e.key) || e.ctrlKey || e.metaKey
      const hasSelection = e.currentTarget.selectionStart !== e.currentTarget.selectionEnd
      if (e.currentTarget.value.length >= kLegendRangeMaxCharacters && !isAllowedKey && !hasSelection) {
        e.preventDefault()
      }
    }
  }

  const renderInput = (bound: LegendBound, text: string, onChange: (v: string) => void) => (
    <TextField value={text} onChange={(v) => onChange(filterLegendRangeInput(v))}>
      <Label className="form-label">
        {t(`V3.Inspector.graph.legendRange.${bound}`)}
      </Label>
      <Input
        className="form-input"
        data-testid={`legend-range-${bound}-input`}
        style={{ width: `${text.length + kLegendRangeBufferChars}ch` }}
        onKeyDown={(e) => handleKeyDown(e, bound)}
        onBlur={(e) => commit(bound, e.target.value)}
      />
    </TextField>
  )

  return (
    <div className="legend-range-section">
      <label className="form-label legend-range-label">{t("V3.Inspector.graph.legendRange")}</label>
      <div className="legend-range-inputs">
        <div className="inline-input-group" data-testid="legend-range-min-setting">
          {renderInput("min", minInput, setMinInput)}
        </div>
        <div className="inline-input-group" data-testid="legend-range-max-setting">
          {renderInput("max", maxInput, setMaxInput)}
        </div>
      </div>
    </div>
  )
})
