import {
  Checkbox, Flex, FormControl, FormLabel, Radio, RadioGroup, Select, Slider, SliderThumb, SliderTrack, Stack
} from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import React, { useRef } from "react"
import { AttributeBinningTypes, AttributeBinningType } from "../../../models/shared/data-set-metadata"
import {
  kDefaultHighAttributeColor, kDefaultLowAttributeColor
} from "../../../models/shared/data-set-metadata-constants"
import { t } from "../../../utilities/translation/translate"
import { IMapPointLayerModel, isMapPointDisplayType } from "../../map/models/map-point-layer-model"
import { getScaleThresholds } from "../components/legend/choropleth-legend/choropleth-legend"
import { PointDisplayType } from "../data-display-types"
import { IDataConfigurationModel } from "../models/data-configuration-model"
import { IDisplayItemDescriptionModel } from "../models/display-item-description-model"
import { PointColorSetting } from "./point-color-setting"

import "./inspector-panel.scss"

interface IProps {
  dataConfiguration: IDataConfigurationModel
  displayItemDescription: IDisplayItemDescriptionModel
  mapPointLayerModel?: IMapPointLayerModel
  pointDisplayType?: PointDisplayType
  isTransparent?: boolean
  onBackgroundTransparencyChange?: (isTransparent: boolean) => void
  plotBackgroundColor?: string
  onBackgroundColorChange?: (color: string) => void
}

export const DisplayItemFormatControl = observer(function PointFormatControl(props: IProps) {
  const {
    dataConfiguration, displayItemDescription, mapPointLayerModel, pointDisplayType,
    isTransparent, onBackgroundTransparencyChange, plotBackgroundColor, onBackgroundColorChange
  } = props
  const legendAttrID = dataConfiguration.attributeID("legend")
  const attrType = dataConfiguration.attributeType("legend")
  const categoriesRef = useRef<string[] | undefined>()
  categoriesRef.current = dataConfiguration?.categoryArrayForAttrRole('legend')
  const metadata = dataConfiguration.metadata

  const handlePointColorChange = (color: string) => {
    displayItemDescription.applyModelChange(() => {
      displayItemDescription.setPointColor(color)
    },  {
      undoStringKey: "DG.Undo.graph.changePointColor",
      redoStringKey: "DG.Redo.graph.changePointColor",
      log: attrType === "categorical" ? "Changed categorical point color" : "Changed point color"
    })
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

  const handleAttributeBinningTypeChange = (_scaleType: AttributeBinningType) => {
    metadata?.applyModelChange(() => {
      metadata.setAttributeBinningType(legendAttrID, _scaleType)
    }, {
      undoStringKey: "DG.Undo.graph.changeAttributeBinningType",
      redoStringKey: "DG.Redo.graph.changeAttributeBinningType",
      log: "Changed attribute binning type"
    })
  }

  const handleCatPointColorChange = (color: string, cat: string) => {
    dataConfiguration.applyModelChange(
      () => {
        dataConfiguration.setLegendColorForCategory(cat, color)
      },
      {
        undoStringKey: "DG.Undo.graph.changePointColor",
        redoStringKey: "DG.Redo.graph.changePointColor",
        log: "Changed categorical point color"
      }
    )
  }

  const handlePointStrokeColorChange = (color: string) => {
    displayItemDescription.applyModelChange(
      () => displayItemDescription.setPointStrokeColor(color),
      {
        undoStringKey: "DG.Undo.graph.changeStrokeColor",
        redoStringKey: "DG.Redo.graph.changeStrokeColor",
        log: "Changed stroke color"
      }
    )
  }

  const handlePointTypeChange = (pointType: string) => {
    if (!isMapPointDisplayType(pointType)) return

    mapPointLayerModel?.applyModelChange(
      () => mapPointLayerModel.setDisplayType(pointType),
      {
        undoStringKey: "V3.Undo.map.inspector.changePointType",
        redoStringKey: "V3.Redo.map.inspector.changePointType",
        log: "Changed point type"
      }
    )
  }

  const handleLockQuantilesChange = (areLocked: boolean) => {
    const prefix = areLocked ? "lock" : "unlock"
    dataConfiguration.applyModelChange(
      () => {
        const quantiles = areLocked ? getScaleThresholds(dataConfiguration.legendNumericColorScale) : []
        dataConfiguration.setLegendQuantiles(quantiles)
        dataConfiguration.setLegendQuantilesAreLocked(areLocked)
      },
      {
        undoStringKey: `DG.Undo.legend.${prefix}Quantiles`,
        redoStringKey: `DG.Redo.legend.${prefix}Quantiles`,
        log: `Set legend quantiles to be ${prefix}ed`
      }
    )
  }

  const renderPlotControlsIfAny = () => {
    if (onBackgroundTransparencyChange && onBackgroundColorChange) {
      return (
        <div>
          <FormControl isDisabled={isTransparent}>
            <Flex className="palette-row color-picker-row">
              <FormLabel className="form-label color-picker">{t("DG.Inspector.backgroundColor")}</FormLabel>
              <PointColorSetting propertyLabel={t("DG.Inspector.backgroundColor")}
                                onColorChange={(color) => onBackgroundColorChange(color)}
                                swatchBackgroundColor={plotBackgroundColor ?? "#FFFFFF"}/>
            </Flex>
          </FormControl>
          <FormControl>
            <Checkbox
              mt="6px" isChecked={isTransparent}
              onChange={e => onBackgroundTransparencyChange(e.target.checked)}>
              {t("DG.Inspector.graphTransparency")}
            </Checkbox>
          </FormControl>
        </div>
      )
    }
  }

  const renderSliderControlIfAny = () => {
    if (displayItemDescription.pointSizeMultiplier >= 0) {
      return (
        <FormControl size="xs">
          <Flex className="palette-row">
            <FormLabel className="form-label">{t("DG.Inspector.pointSize")}</FormLabel>
            <Slider aria-label="point-size-slider" ml="10px" min={0} max={2} data-testid="point-size-slider"
                    defaultValue={displayItemDescription.pointSizeMultiplier} step={0.01}
                    onChange={(val) => displayItemDescription.setDynamicPointSizeMultiplier(val)}
                    onChangeEnd={(val) => {
                      displayItemDescription.applyModelChange(
                        () => displayItemDescription.setPointSizeMultiplier(val),
                        {
                          undoStringKey: "DG.Undo.graph.changePointSize",
                          redoStringKey: "DG.Redo.graph.changePointSize",
                          log: "Changed point size"
                        }
                      )
                    }}
                    isDisabled={pointDisplayType === "bars"}>
              <SliderTrack bg="#b8b8b8"/>
              <SliderThumb border="1px solid #cfcfcf"/>
            </Slider>
          </Flex>
        </FormControl>
      )
    }
  }

  const colorRange = metadata?.getAttributeColorRange(legendAttrID)
  const binningType = metadata?.getAttributeBinningType(legendAttrID)
  return (
    <Flex className="palette-form" direction="column">
      {mapPointLayerModel && legendAttrID && (
        <RadioGroup defaultValue={mapPointLayerModel.displayType}>
          <Stack>
            <Radio
              size="md"
              value="points"
              data-testid="point-type-points-radio-button"
              onChange={(e) => handlePointTypeChange(e.target.value)}
            >
              {t("V3.map.inspector.displayAsPoints")}
            </Radio>
            <Radio
              size="md"
              value="heatmap"
              data-testid="point-type-heatmap-radio-button"
              onChange={(e) => handlePointTypeChange(e.target.value)}
            >
              {t("V3.map.inspector.displayAsHeatmap")}
            </Radio>
          </Stack>
        </RadioGroup>
      )}

      { renderSliderControlIfAny() }

      <FormControl isDisabled={displayItemDescription.pointStrokeSameAsFill} className="palette-form-control">
        <Flex className="palette-row color-picker-row">
          <FormLabel className="form-label color-picker">{t("DG.Inspector.stroke")}</FormLabel>
          <PointColorSetting propertyLabel={t("DG.Inspector.stroke")}
                            onColorChange={(color)=>handlePointStrokeColorChange(color)}
                            swatchBackgroundColor={displayItemDescription.pointStrokeColor}/>
        </Flex>
        <FormControl>
          <Checkbox data-testid="stroke-same-as-fill-checkbox"
                    mt="6px" isChecked={displayItemDescription.pointStrokeSameAsFill}
                    onChange={e => {
                      displayItemDescription.applyModelChange(
                        () => displayItemDescription.setPointStrokeSameAsFill(e.target.checked),
                        {
                          undoStringKey: "DG.Undo.graph.changeStrokeColor",
                          redoStringKey: "DG.Redo.graph.changeStrokeColor",
                          log: "Changed stroke color"
                        }
                      )
                    }}>
            {t("DG.Inspector.strokeSameAsFill")}
          </Checkbox>
        </FormControl>
        <>
          {dataConfiguration.attributeID("legend") &&
            attrType === "categorical"
              ? <FormControl className="cat-color-setting">
                {categoriesRef.current?.map(category => {
                  return (
                    <Flex direction="row" key={category} className="palette-row color-picker-row cat-color-picker">
                      <FormLabel className="form-label color-picker">{category}</FormLabel>
                      <PointColorSetting key={category} propertyLabel={category}
                        onColorChange={(color) => handleCatPointColorChange(color, category)}
                        swatchBackgroundColor={dataConfiguration.getLegendColorForCategory(category)}/>
                    </Flex>
                  )
                })}
                </FormControl>
              : attrType === "numeric"
                ?
              <>
                <FormControl className="num-color-setting">
                  <Flex className="palette-row color-picker-row">
                    <FormLabel className="form-label color-picker">{t("DG.Inspector.legendColor")}</FormLabel>
                    <PointColorSetting
                      propertyLabel={t("DG.Inspector.legendColor")}
                      onColorChange={(color) => handleLowAttributeColorChange(color)}
                      swatchBackgroundColor={colorRange?.low ?? kDefaultLowAttributeColor}
                    />
                    <PointColorSetting
                      propertyLabel={t("DG.Inspector.legendColor")}
                      onColorChange={(color) => handleHighAttributeColorChange(color)}
                      swatchBackgroundColor={colorRange?.high ?? kDefaultHighAttributeColor}
                    />
                  </Flex>
                </FormControl>
                <FormControl>
                  <Checkbox data-testid="lock-legend-quantiles-checkbox"
                            mt="6px" isChecked={dataConfiguration.legendQuantilesAreLocked}
                            onChange={(e) => handleLockQuantilesChange(e.target.checked)}>
                    {t("DG.Inspector.lockLegendQuantiles")}
                  </Checkbox>
                </FormControl>
              </>
                : attrType === "color"
                  ? null
                  : (
                    <Flex className="palette-row color-picker-row">
                      <FormLabel className="form-label color-picker">{t("DG.Inspector.color")}</FormLabel>
                      <PointColorSetting propertyLabel={t("DG.Inspector.color")}
                                        onColorChange={(color) => handlePointColorChange(color)}
                                        swatchBackgroundColor={displayItemDescription.pointColor}/>
                    </Flex>
                  )
          }
        </>
      </FormControl>
      {attrType === "numeric" &&
        <FormControl>
          <Flex>
            <FormLabel className="form-label legend-bins-menu">{t("DG.Inspector.legendBins")}</FormLabel>
            <Select size="xs" data-testid="legend-bins-type-select" value={binningType}
              onChange={e => handleAttributeBinningTypeChange(e.target.value as AttributeBinningType)}
            >
              { AttributeBinningTypes.map(_binningType =>
                <option key={_binningType} value={_binningType}>{t(`DG.Inspector.legendBins.${_binningType}`)}</option>
              )}
            </Select>
          </Flex>
        </FormControl>
      }
      {renderPlotControlsIfAny()}
    </Flex>
  )
})
