import React, {ReactElement, useRef} from "react"
import {observer} from "mobx-react-lite"
import {
  Checkbox, Flex, FormControl, FormLabel, Input, Slider, SliderThumb, SliderTrack
} from "@chakra-ui/react"
import {IDataConfigurationModel} from "../models/data-configuration-model"
import {IDisplayItemDescriptionModel} from "../models/display-item-description-model"
import {missingColor} from "../../../utilities/color-utils"
import {t} from "../../../utilities/translation/translate"

import "./inspector-panel.scss"

interface IProps {
  dataConfiguration: IDataConfigurationModel
  displayItemDescription: IDisplayItemDescriptionModel
  pointDisplayType?: string
  isTransparent?: boolean
  setIsTransparent?: (isTransparent: boolean) => void
  plotBackgroundColor?: string
  setPlotBackgroundColor?: (color: string) => void
}

export const DisplayItemFormatControl = observer(function PointFormatControl(props: IProps) {
  const {
    dataConfiguration, displayItemDescription, pointDisplayType,
    isTransparent, setIsTransparent, plotBackgroundColor, setPlotBackgroundColor
  } = props
  const legendAttrID = dataConfiguration.attributeID("legend")
  const attrType = dataConfiguration?.dataset?.attrFromID(legendAttrID ?? "")?.type
  const categoriesRef = useRef<string[] | undefined>()
  categoriesRef.current = dataConfiguration?.categoryArrayForAttrRole('legend')

  const catPointColorSettingArr: ReactElement[] = []
  categoriesRef.current?.forEach(cat => {
    catPointColorSettingArr.push(
      <Flex direction="row" key={cat} className="palette-row cat-color-picker">
        <FormLabel className="form-label">{cat}</FormLabel>
        <Input type="color" className="color-picker-thumb categorical"
               value={dataConfiguration?.getLegendColorForCategory(cat) || missingColor}
               onChange={e => displayItemDescription.setPointColor(e.target.value)}/>
      </Flex>
    )
  })

  const renderPlotControlsIfAny = () => {
    if (setIsTransparent && setPlotBackgroundColor) {
      return (
        <div>
          <FormControl isDisabled={isTransparent}>
            <Flex className="palette-row">
              <FormLabel className="form-label">{t("DG.Inspector.backgroundColor")}</FormLabel>
              <Input type="color" className="color-picker-thumb" value={plotBackgroundColor}
                     onChange={e => setPlotBackgroundColor(e.target.value)}/>
            </Flex>
          </FormControl>
          <FormControl>
            <Checkbox
              mt="6px" isChecked={isTransparent}
              onChange={e => setIsTransparent(e.target.checked)}>
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
                    onChange={(val) => {
                      displayItemDescription.applyUndoableAction(
                        () => displayItemDescription.setPointSizeMultiplier(val),
                        {
                          undoStringKey: "DG.Undo.graph.changePointSize",
                          redoStringKey: "DG.Redo.graph.changePointSize"
                        }
                      )
                    }}
                    isDisabled={pointDisplayType === "bars"}>
              <SliderTrack/>
              <SliderThumb/>
            </Slider>
          </Flex>
        </FormControl>
      )
    }
  }

  return (
    <Flex className="palette-form" direction="column">

      { renderSliderControlIfAny() }

      <FormControl isDisabled={displayItemDescription.pointStrokeSameAsFill}>
        <Flex className="palette-row">
          <FormLabel className="form-label">{t("DG.Inspector.stroke")}</FormLabel>
          <Input type="color" className="color-picker-thumb" value={displayItemDescription.pointStrokeColor}
                 onChange={(e) => {
                   displayItemDescription.applyUndoableAction(
                     () => displayItemDescription.setPointStrokeColor(e.target.value),
                     {
                       undoStringKey: "DG.Undo.graph.changeStrokeColor",
                       redoStringKey: "DG.Redo.graph.changeStrokeColor"
                     }
                   )
                 }}/>
        </Flex>
      </FormControl>
      <FormControl>
        <>
          { /*todo: The legend color controls are not in place yet*/ }
          {dataConfiguration.attributeID("legend") &&
          attrType === "categorical"
            ? <FormControl className="cat-color-setting">{catPointColorSettingArr}</FormControl>
            : attrType === "numeric"
              ?(
              <FormControl className="num-color-setting">
                <Flex className="palette-row">
                  {/* Sets the min and max colors for numeric legend. Currently not implemented so
                                this sets the same color for all the points*/}
                  <FormLabel className="form-label">{t("DG.Inspector.legendColor")}</FormLabel>
                  <Input type="color" className="color-picker-thumb" value={missingColor}
                         onChange={e => displayItemDescription.setPointColor(e.target.value)}/>
                  <Input type="color" className="color-picker-thumb" value={missingColor}
                         onChange={e => displayItemDescription.setPointColor(e.target.value)}/>
                </Flex>
              </FormControl>)
              :(
              <Flex className="palette-row">
                <FormLabel className="form-label">{t("DG.Inspector.color")}</FormLabel>
                <Input type="color" className="color-picker-thumb"
                       value={displayItemDescription.pointColor}
                       onChange={e => {
                         displayItemDescription.applyUndoableAction(
                           () => displayItemDescription.setPointColor(e.target.value),
                           {
                             undoStringKey: "DG.Undo.graph.changePointColor",
                             redoStringKey: "DG.Redo.graph.changePointColor"
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
            displayItemDescription.applyUndoableAction(
              () => displayItemDescription.setPointStrokeSameAsFill(e.target.checked),
              {
                undoStringKey: "DG.Undo.graph.changeStrokeColor",
                redoStringKey: "DG.Redo.graph.changeStrokeColor"
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
