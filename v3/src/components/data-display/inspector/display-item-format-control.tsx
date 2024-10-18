import React, {ReactElement, useCallback, useRef, useState} from "react"
import {observer} from "mobx-react-lite"
import {Button, ButtonGroup, Checkbox, Flex, FocusLock, FormControl, FormLabel, Input, Popover, PopoverBody,
  PopoverContent, PopoverTrigger, Portal, Slider, SliderThumb, SliderTrack, Spacer,
} from "@chakra-ui/react"
import {IDataConfigurationModel} from "../models/data-configuration-model"
import {IDisplayItemDescriptionModel} from "../models/display-item-description-model"
import {missingColor, kellyColors} from "../../../utilities/color-utils"
import {t} from "../../../utilities/translation/translate"
import { ColorPicker } from "../../case-tile-common/color-picker"

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
  const [openPopover, setOpenPopover] = useState<string | null>(null);

  // const handlePointColorChange = (color: string) => {
  //   displayItemDescription.applyModelChange(() => {
  //     displayItemDescription.setPointColor(color)
  //   },  {
  //     undoStringKey: "DG.Undo.graph.changePointColor",
  //     redoStringKey: "DG.Redo.graph.changePointColor",
  //     log: "Changed point color"
  //   })
  // }
  const handleSwatchClick = (cat: string) => {
    setOpenPopover(openPopover === cat ? null : cat)
  }

  const catPointColorSettingArr: ReactElement[] = []
  categoriesRef.current?.forEach(cat => {
    catPointColorSettingArr.push(
      <Flex direction="row" key={cat} className="palette-row color-picker-row cat-color-picker">
        <FormLabel className="form-label color-picker">{cat}</FormLabel>
        <Popover isLazy={true} isOpen={openPopover === cat} closeOnBlur={false}>
          <PopoverTrigger>
            <button className="color-picker-thumb" onClick={()=>handleSwatchClick(cat)}>
              <div className="color-picker-thumb-swatch"
                    style={{backgroundColor: dataConfiguration.getLegendColorForCategory(cat) || missingColor}}/>
            </button>
          </PopoverTrigger>
          <Portal>
            <PaletteColorPicker dataConfiguration={dataConfiguration} cat={cat}/>
          </Portal>
        </Popover>
      </Flex>
    )
  })

  const renderPlotControlsIfAny = () => {
    if (onBackgroundTransparencyChange && onBackgroundColorChange) {
      return (
        <div>
          <FormControl isDisabled={isTransparent}>
            <Flex className="palette-row color-picker-row">
              <FormLabel className="form-label color-picker">{t("DG.Inspector.backgroundColor")}</FormLabel>
              <Input type="color" className="color-picker-thumb" value={plotBackgroundColor}
                     onChange={e => onBackgroundColorChange(e.target.value)}/>
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
          <FormLabel className="form-label color-picker stroke">{t("DG.Inspector.stroke")}</FormLabel>
          <Input type="color" className="color-picker-thumb" value={displayItemDescription.pointStrokeColor}
                 onChange={(e) => {
                   displayItemDescription.applyModelChange(
                     () => displayItemDescription.setPointStrokeColor(e.target.value),
                     {
                       undoStringKey: "DG.Undo.graph.changeStrokeColor",
                       redoStringKey: "DG.Redo.graph.changeStrokeColor",
                       log: "Changed stroke color"
                     }
                   )
                 }}/>
        </Flex>
        <>
          { /*todo: The legend color controls are not in place yet*/ }
          {dataConfiguration.attributeID("legend") &&
          attrType === "categorical"
            ? <FormControl className="cat-color-setting">{catPointColorSettingArr}</FormControl>
            : attrType === "numeric"
              ?(
              <FormControl className="num-color-setting">
                <Flex className="palette-row color-picker-row">
                  {/* Sets the min and max colors for numeric legend. Currently not implemented so
                                this sets the same color for all the points*/}
                  <FormLabel className="form-label color-picker legend">{t("DG.Inspector.legendColor")}</FormLabel>
                  <Input type="color" className="color-picker-thumb" value={missingColor}
                         onChange={e => displayItemDescription.setPointColor(e.target.value)}/>
                  <Input type="color" className="color-picker-thumb" value={missingColor}
                         onChange={e => displayItemDescription.setPointColor(e.target.value)}/>
                </Flex>
              </FormControl>)
              :(
              <Flex className="palette-row color-picker-row">
                <FormLabel className="form-label color-picker color">{t("DG.Inspector.color")}</FormLabel>
                <Input type="color" className="color-picker-thumb"
                       value={displayItemDescription.pointColor}
                       onChange={e => {
                         displayItemDescription.applyModelChange(
                           () => displayItemDescription.setPointColor(e.target.value),
                           {
                             undoStringKey: "DG.Undo.graph.changePointColor",
                             redoStringKey: "DG.Redo.graph.changePointColor",
                             log: attrType === "categorical" ? "Changed categorical point color" : "Changed point color"
                           }
                         )
                       }}/>
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

interface ColorPickerIProps {
  dataConfiguration: IDataConfigurationModel
  cat: string
}

export const PaletteColorPicker = (props: ColorPickerIProps) => {
  const dataConfiguration = props.dataConfiguration
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [inputValue, setInputValue] = useState(missingColor)
  const nonStandardColorSelected = false

  const updateValue = useCallback((value: string) => {
    setInputValue(value)
    console.log("ColorPicker: updateValue", value)
    // dataConfiguration.applyModelChange(() => {
    //   // CategorySet.setColorForCategory(props.cat, value)
    // })
  }, [])

  const rejectValue = useCallback(() => {
    setShowColorPicker(false)
  }, [])

  const acceptValue = useCallback(() => {
    setShowColorPicker(false)
    console.log("ColorPicker: acceptValue", inputValue)
  }, [])

  const handleShowColorPicker = (evt: React.MouseEvent) => {
    evt.preventDefault()
    evt.stopPropagation()
    console.log("handleShowColorPicker showColorPicker", showColorPicker)
    setShowColorPicker(!showColorPicker)
  }

  const baseColors = ["#000000", "#a9a9a9", "#d3d3d3", "#FFFFFF"]
  const swatchColors = [...baseColors, ...kellyColors.slice(0, 12)]

  return (
    <PopoverContent className="color-picker-palette-container">
      <FocusLock persistentFocus={true}>
        <PopoverBody className="color-picker-palette">
          <div className="color-swatch-palette">
            <div className="color-swatch-grid">
              {swatchColors.map((color, index) => (
                <div className="color-swatch-cell" style={{ backgroundColor: color }} key={index} />
              ))}
              {nonStandardColorSelected &&
                <div className="color-swatch-row">
                  <div className="color-swatch-cell" style={{backgroundColor: "#FFFF00"}}/>
                </div>}
            </div>
            <div className="color-swatch-footer">
              <Button onClick={handleShowColorPicker}>
                {showColorPicker ? "Less" : "More"}
              </Button>
            </div>
          </div>
          {showColorPicker &&
            <div className="color-picker">
              <ColorPicker color={inputValue} onChange={updateValue} />
              <Flex>
                <Spacer/>
                <ButtonGroup>
                  <Button className="cancel-button" size="xs" fontWeight="normal" onClick={rejectValue}>
                    {t("V3.CaseTable.colorPalette.cancel")}
                  </Button>
                  <Button className="set-color-button" size="xs" fontWeight="normal" onClick={acceptValue}>
                    {t("V3.CaseTable.colorPalette.setColor")}
                  </Button>
                </ButtonGroup>
              </Flex>
            </div>
          }
        </PopoverBody>
      </FocusLock>
    </PopoverContent>
  )
}
