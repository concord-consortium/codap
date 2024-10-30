import React, {useRef} from "react"
import {observer} from "mobx-react-lite"
import {Checkbox, Flex, FormControl, FormLabel, Slider, SliderThumb, SliderTrack
  } from "@chakra-ui/react"
import { PointColorSetting } from "./point-color-setting"
import {IDataConfigurationModel} from "../models/data-configuration-model"
import {IDisplayItemDescriptionModel} from "../models/display-item-description-model"
import {t} from "../../../utilities/translation/translate"

import "./inspector-panel.scss"

interface IProps {
  dataConfiguration: IDataConfigurationModel
  displayItemDescription: IDisplayItemDescriptionModel
  pointDisplayType?: string
  isTransparent?: boolean
  onBackgroundTransparencyChange?: (isTransparent: boolean) => void
  plotBackgroundColor?: string
  onBackgroundColorChange?: (color: string) => void
}

export const DisplayItemFormatControl = observer(function PointFormatControl(props: IProps) {
  const {
    dataConfiguration, displayItemDescription, pointDisplayType,
    isTransparent, onBackgroundTransparencyChange, plotBackgroundColor, onBackgroundColorChange
  } = props
  const legendAttrID = dataConfiguration.attributeID("legend")
  const attrType = dataConfiguration?.dataset?.attrFromID(legendAttrID ?? "")?.type
  const categoriesRef = useRef<string[] | undefined>()
  categoriesRef.current = dataConfiguration?.categoryArrayForAttrRole('legend')

  const handlePointColorChange = (color: string) => {
    displayItemDescription.applyModelChange(() => {
      displayItemDescription.setPointColor(color)
    },  {
      undoStringKey: "DG.Undo.graph.changePointColor",
      redoStringKey: "DG.Redo.graph.changePointColor",
      log: attrType === "categorical" ? "Changed categorical point color" : "Changed point color"
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

  return (
    <Flex className="palette-form" direction="column">

      { renderSliderControlIfAny() }

      <FormControl isDisabled={displayItemDescription.pointStrokeSameAsFill} className="palette-form-control">
        <Flex className="palette-row color-picker-row">
          <FormLabel className="form-label color-picker">{t("DG.Inspector.stroke")}</FormLabel>
          <PointColorSetting propertyLabel={t("DG.Inspector.stroke")}
                            onColorChange={(color)=>handlePointStrokeColorChange(color)}
                            swatchBackgroundColor={displayItemDescription.pointStrokeColor}/>
        </Flex>
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
                ? <FormControl className="num-color-setting">
                    <Flex className="palette-row color-picker-row">
                      <FormLabel className="form-label color-picker">{t("DG.Inspector.legendColor")}</FormLabel>
                      {/* Sets the min and max colors for numeric legend. Currently not implemented so
                                    this sets the same color for all the points*/}
                      <PointColorSetting propertyLabel={t("DG.Inspector.legendColor")}
                                        onColorChange={(color) => handlePointColorChange(color)}
                                        swatchBackgroundColor={displayItemDescription.pointColor}/>
                      <PointColorSetting propertyLabel={t("DG.Inspector.legendColor")}
                                        onColorChange={(color) => handlePointColorChange(color)}
                                        swatchBackgroundColor={displayItemDescription.pointColor}/>
                    </Flex>
                  </FormControl>
                :(
                <Flex className="palette-row color-picker-row">
                  <FormLabel className="form-label color-picker">{t("DG.Inspector.color")}</FormLabel>
                  <PointColorSetting propertyLabel={t("DG.Inspector.color")}
                                    onColorChange={(color) => handlePointColorChange(color)}
                                    swatchBackgroundColor={displayItemDescription.pointColor}/>
                </Flex>)
          }
        </>
      </FormControl>
      <FormControl>
        <Checkbox
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
      {renderPlotControlsIfAny()}
    </Flex>
  )
})
