import { observer } from "mobx-react-lite"
import React, { useRef, useState } from "react"
import {
  Button, ListBox, ListBoxItem, Popover, Select, SelectValue
} from "react-aria-components"
import { AttributeBinningTypes, AttributeBinningType } from "../../../models/shared/data-set-metadata"
import {
  kDefaultHighAttributeColor, kDefaultLowAttributeColor
} from "../../../models/shared/data-set-metadata-constants"
import { t } from "../../../utilities/translation/translate"
import { PaletteCheckbox } from "../../palette-checkbox"
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
      undoStringKey: "DG.Undo.graph.changePointColor",
      redoStringKey: "DG.Redo.graph.changePointColor",
      log: attrType === "categorical" ? "Changed categorical point color" : "Changed point color"
    })
  }

  const handleCatPointColorChange = (color: string, cat: string) => {
    dataConfiguration.applyModelChange(
      () => dataConfiguration.setLegendColorForCategory(cat, color),
      {
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
      undoStringKey: "DG.Undo.graph.changeAttributeColor",
      redoStringKey: "DG.Redo.graph.changeAttributeColor",
      log: "Changed attribute color"
    })
  }

  const handleHighAttributeColorChange = (color: string) => {
    metadata?.applyModelChange(() => {
      metadata.setAttributeColor(legendAttrID, color, "high")
    }, {
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
