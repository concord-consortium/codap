import { clsx } from "clsx"
import { extent, format, max as d3Max, min as d3Min } from "d3"
import { observer } from "mobx-react-lite"
import React, { useEffect, useId, useRef, useState } from "react"
import {
  Button, Group, Input, Label, ListBox, ListBoxItem, NumberField, Popover, Select, SelectValue, TextField
} from "react-aria-components"
import { useTileModelContext } from "../../../hooks/use-tile-model-context"
import { AttributeBinningTypes, AttributeBinningType } from "../../../models/shared/data-set-metadata"
import {
  kDefaultHighAttributeColor, kDefaultLowAttributeColor
} from "../../../models/shared/data-set-metadata-constants"
import { binBoundaryDecimalPlaces } from "../../../utilities/math-utils"
import { t } from "../../../utilities/translation/translate"
import { PaletteCheckbox } from "../../palette-checkbox"
import { getScaleThresholds } from "../components/legend/choropleth-legend/choropleth-legend"
import {
  changeAttributeColorNotification, changeLegendBinCountNotification, changeLegendBinsTypeNotification,
  changeLegendRangeNotification, changePointColorAndAlphaNotification, changePointColorNotification
} from "../data-display-notifications"
import { IDataConfigurationModel, kDefaultLegendBinCount } from "../models/data-configuration-model"
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
  const { tile } = useTileModelContext()
  const legendAttrID = dataConfiguration.attributeID("legend")
  const metadata = dataConfiguration.metadata
  const binningType = metadata?.getAttributeBinningType(legendAttrID)
  // While the quantiles are locked the legend scale is frozen, so this control has no
  // effect; disable it to reflect that.
  const isLocked = !!dataConfiguration.legendQuantilesAreLocked

  const handleAttributeBinningTypeChange = (key: React.Key | null) => {
    if (key == null) return
    const selected = key as AttributeBinningType
    metadata?.applyModelChange(() => {
      metadata.setAttributeBinningType(legendAttrID, selected)
    }, {
      notify: () => changeLegendBinsTypeNotification(tile, selected),
      undoStringKey: "V3.Undo.graph.changeAttributeBinningType",
      redoStringKey: "V3.Redo.graph.changeAttributeBinningType",
      log: "Changed attribute binning type"
    })
  }

  return (
    <div className={clsx("legend-bins-row", { disabled: isLocked })}>
      {/* not a <label>: it names no single control; the Select carries its own aria-label */}
      <span className="form-label legend-bins-menu">{t("V3.Inspector.graph.legendBins")}</span>
      <Select
        aria-label={t("V3.Inspector.graph.legendBins")}
        value={binningType}
        isDisabled={isLocked}
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

interface ILegendBinCountInputProps {
  dataConfiguration: IDataConfigurationModel
}

export const LegendBinCountInput = observer(function LegendBinCountInput(
  { dataConfiguration }: ILegendBinCountInputProps
) {
  const { tile } = useTileModelContext()
  const legendAttrID = dataConfiguration.attributeID("legend")
  const metadata = dataConfiguration.metadata
  const values = dataConfiguration.numericValuesForAttrRole("legend") ?? []
  const cap = Math.min(values.length, new Set(values).size)
  // While the quantiles are locked the legend scale is frozen, so this control has no effect.
  const isLocked = !!dataConfiguration.legendQuantilesAreLocked
  const isDisabled = isLocked || cap < 2
  // The effective (clamped) bin count, so the field reflects what the legend actually renders.
  const value = dataConfiguration.legendBinCount

  const commit = (n: number) => {
    if (!Number.isFinite(n)) return
    // The model clamps too (legendBinCount), but constrain here so the committed value matches.
    const clamped = Math.max(2, Math.min(Math.round(n), cap))
    // Storing the default is redundant; clear the override at the default so the attribute truly
    // reverts to default and leaves no stray metadata. Compare against the *stored* value (not the
    // effective/clamped one) so an explicit re-entry that differs from what's stored is still
    // recorded (e.g. typing the displayed value when the default was clamped down by a low cap).
    const target = clamped === kDefaultLegendBinCount ? undefined : clamped
    const stored = metadata?.getAttributeBinCount(legendAttrID)
    if (target === stored) return // no change to stored metadata
    metadata?.applyModelChange(() => metadata.setAttributeBinCount(legendAttrID, target), {
      notify: () => changeLegendBinCountNotification(tile, clamped),
      undoStringKey: "V3.Undo.legend.setLegendBinCount",
      redoStringKey: "V3.Redo.legend.setLegendBinCount",
      log: "Set legend bin count"
    })
  }

  return (
    <NumberField
      className={clsx("legend-bin-count-field", { disabled: isDisabled })}
      aria-label={t("V3.Inspector.graph.legendBinCount")}
      // A degenerate legend (<2 distinct values) renders a single bin; allow the (disabled) field
      // to reflect that 1 rather than clamping the display up to 2.
      minValue={cap < 2 ? 1 : 2}
      maxValue={Math.max(2, cap)}
      step={1}
      formatOptions={{ maximumFractionDigits: 0 }}
      isDisabled={isDisabled}
      value={value}
      onChange={(n) => commit(n)}
    >
      <Label className="form-label legend-bin-count-label">{t("V3.Inspector.graph.legendBinCount")}</Label>
      <Group className="legend-bin-count-group">
        <Input className="form-input" data-testid="legend-bin-count-input" />
        <Button slot="decrement" className="legend-bin-count-stepper">−</Button>
        <Button slot="increment" className="legend-bin-count-stepper">+</Button>
      </Group>
    </NumberField>
  )
})

const kLegendRangeMaxCharacters = 12
const kLegendRangeBufferChars = 2 // accounts for input field padding

// The number of decimal places the legend uses for its boundary labels, so the Min/Max inputs
// match the legend labels rather than showing raw ~10-digit data values (e.g. random() defaults).
// Returns undefined when the scale is empty/degenerate; the caller then falls back to a plain form.
function legendBoundaryDecimals(dataConfiguration: IDataConfigurationModel) {
  const scale = dataConfiguration.legendNumericColorScale
  const domain = scale?.domain() ?? []
  if (domain.length === 0 || isNaN(Number(domain[0]))) return undefined
  const lo = Number(d3Min(domain as Iterable<number>))
  const hi = Number(d3Max(domain as Iterable<number>))
  // Mirror choropleth-legend's boundary set so the input precision matches the rendered labels.
  const fullBoundaries = [lo, ...getScaleThresholds(scale), hi]
  return binBoundaryDecimalPlaces(fullBoundaries)
}

// Formats a legend bound for display in the Min/Max inputs. With a known decimal count (from the
// legend) it uses a fixed-decimal form matching the labels; otherwise it strips floating-point
// noise (e.g. 0.30000000000000004 -> "0.3") without scientific notation (the input filter rejects
// "e"), keeping very small/large values editable.
function formatLegendBound(value?: number, decimals?: number) {
  if (value == null) return ""
  if (decimals != null) return format(`.${decimals}f`)(value)
  const rounded = parseFloat(value.toPrecision(10))
  return rounded.toLocaleString("en-US", { useGrouping: false, maximumFractionDigits: 20 })
}

// Allows an optional leading minus, digits, and a single decimal point, capping the
// length so paste/drag/programmatic input honors the same limit as typing.
function filterLegendRangeInput(value: string): string {
  let filtered = value.replace(/[^0-9.-]/g, "")
  const isNegative = filtered.startsWith("-")
  filtered = filtered.replace(/-/g, "")
  const parts = filtered.split(".")
  if (parts.length > 2) {
    filtered = `${parts.shift()}.${parts.join("")}`
  }
  return `${isNegative ? "-" : ""}${filtered}`.slice(0, kLegendRangeMaxCharacters)
}

type LegendBound = "min" | "max"

interface ILegendRangeInputsProps {
  dataConfiguration: IDataConfigurationModel
}

export const LegendRangeInputs = observer(function LegendRangeInputs(
  { dataConfiguration }: ILegendRangeInputsProps
) {
  const { tile } = useTileModelContext()
  const headingId = useId()
  const legendAttrID = dataConfiguration.attributeID("legend")
  const metadata = dataConfiguration.metadata
  const { min: overrideMin, max: overrideMax } = metadata?.getAttributeLegendRange(legendAttrID) ?? {}
  const [dataMin, dataMax] = extent(dataConfiguration.numericValuesForAttrRole("legend") ?? [])

  // Reports the resulting effective bounds (override ?? data extent) after a range edit. Re-reads
  // the model because it runs inside applyModelChange, after the change is applied (closure vars
  // captured at render are stale at that point).
  const notifyRangeChange = () => {
    const { min, max } = metadata?.getAttributeLegendRange(legendAttrID) ?? {}
    const [liveMin, liveMax] = extent(dataConfiguration.numericValuesForAttrRole("legend") ?? [])
    return changeLegendRangeNotification(tile, min ?? liveMin, max ?? liveMax)
  }
  const effectiveMin = overrideMin ?? dataMin
  const effectiveMax = overrideMax ?? dataMax
  const decimals = legendBoundaryDecimals(dataConfiguration)
  const displayMin = formatLegendBound(effectiveMin, decimals)
  const displayMax = formatLegendBound(effectiveMax, decimals)
  // While the quantiles are locked the legend scale is frozen, so edits here have no
  // effect; disable the inputs to reflect that.
  const isLocked = !!dataConfiguration.legendQuantilesAreLocked

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
    // No change from what's shown: don't write anything. This avoids creating a spurious
    // override (e.g. pinning the range to the live data extent) on a plain focus/blur, and
    // avoids redundant undo steps when the same value is re-entered.
    if (text === (bound === "min" ? displayMin : displayMax)) return
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
        notify: notifyRangeChange,
        undoStringKey: bound === "min" ? "V3.Undo.legend.clearLegendMin" : "V3.Undo.legend.clearLegendMax",
        redoStringKey: bound === "min" ? "V3.Redo.legend.clearLegendMin" : "V3.Redo.legend.clearLegendMax",
        log: bound === "min" ? "Clear legend min" : "Clear legend max"
      })
      return
    }
    const value = Number(text)
    // Numeric no-op: with label-precision formatting the display ("5.0") can differ from an
    // equivalent typed value ("5"), so the string check above misses it. Treat a value equal to the
    // current effective bound as no change to avoid a spurious override (and undo step) on re-entry.
    const currentEffective = bound === "min" ? effectiveMin : effectiveMax
    if (Number.isFinite(value) && value === currentEffective) return
    // Validate a typed value against the other effective bound; invalid values silently revert.
    const other = bound === "min" ? effectiveMax : effectiveMin
    const valid = Number.isFinite(value) &&
      (other == null || (bound === "min" ? value < other : value > other))
    if (!valid) {
      revert(bound)
      return
    }
    metadata?.applyModelChange(() => setBound(value), {
      notify: notifyRangeChange,
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
    <TextField value={text} isDisabled={isLocked} onChange={(v) => onChange(filterLegendRangeInput(v))}>
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
    <div
      role="group"
      aria-labelledby={headingId}
      className={clsx("legend-range-section", { disabled: isLocked })}
      aria-disabled={isLocked || undefined}
    >
      {/* a group heading, not a <label>: it names the Min/Max group, not one control */}
      <div id={headingId} className="form-label">{t("V3.Inspector.graph.legendRange")}</div>
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
