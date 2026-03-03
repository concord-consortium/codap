import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import { Checkbox, Radio, RadioGroup } from "react-aria-components"
import { t } from "../../../utilities/translation/translate"
import { If } from "../../common/if"
import { IMapPointLayerModel, isMapPointDisplayType } from "../../map/models/map-point-layer-model"
import { PointDisplayType } from "../data-display-types"
import { IDataConfigurationModel } from "../models/data-configuration-model"
import { IDisplayItemDescriptionModel } from "../models/display-item-description-model"
import { LegendBinsSelect, LegendColorControls } from "./legend-color-controls"
import { PlotBackgroundControls } from "./plot-background-controls"
import { PointColorSetting } from "./point-color-setting"
import { PointSizeSlider } from "./point-size-slider"

import "./display-item-format-control.scss"

interface IDisplayItemFormatControlProps {
  dataConfiguration: IDataConfigurationModel
  displayItemDescription: IDisplayItemDescriptionModel
  mapPointLayerModel?: IMapPointLayerModel
  pointDisplayType?: PointDisplayType
  isTransparent?: boolean
  onBackgroundTransparencyChange?: (isTransparent: boolean) => void
  plotBackgroundColor?: string
  onBackgroundColorChange?: (color: string) => void
}

export const DisplayItemFormatControl = observer(function DisplayItemFormatControl(
  props: IDisplayItemFormatControlProps
) {
  const {
    dataConfiguration, displayItemDescription, mapPointLayerModel, pointDisplayType,
    isTransparent, onBackgroundTransparencyChange, plotBackgroundColor, onBackgroundColorChange
  } = props
  const legendAttrID = dataConfiguration.attributeID("legend")
  const attrType = dataConfiguration.attributeType("legend")

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

  return (
    <div className="palette-form">
      <If condition={!!(mapPointLayerModel && legendAttrID)}>
        <RadioGroup
          defaultValue={mapPointLayerModel?.displayType}
          onChange={handlePointTypeChange}
          aria-label={t("V3.map.inspector.displayAsPoints")}
        >
          <Radio value="points" data-testid="point-type-points-radio-button">
            {() => (
              <>
                <div className="radio-indicator" />
                {t("V3.map.inspector.displayAsPoints")}
              </>
            )}
          </Radio>
          <Radio value="heatmap" data-testid="point-type-heatmap-radio-button">
            {() => (
              <>
                <div className="radio-indicator" />
                {t("V3.map.inspector.displayAsHeatmap")}
              </>
            )}
          </Radio>
        </RadioGroup>
      </If>

      <If condition={displayItemDescription.pointSizeMultiplier >= 0}>
        <PointSizeSlider
          displayItemDescription={displayItemDescription}
          pointDisplayType={pointDisplayType}
        />
      </If>

      <LegendColorControls
        dataConfiguration={dataConfiguration}
        displayItemDescription={displayItemDescription}
      />

      <If condition={attrType === "numeric"}>
        <LegendBinsSelect dataConfiguration={dataConfiguration} />
      </If>

      <div className={clsx("stroke-section", { disabled: displayItemDescription.pointStrokeSameAsFill })}>
        <div className="palette-row color-picker-row">
          <label className="form-label color-picker">{t("DG.Inspector.stroke")}</label>
          <PointColorSetting propertyLabel={t("DG.Inspector.stroke")}
                            onColorChange={(color) => handlePointStrokeColorChange(color)}
                            swatchBackgroundColor={displayItemDescription.pointStrokeColor}/>
        </div>
      </div>
      <Checkbox
        data-testid="stroke-same-as-fill-checkbox"
        isSelected={displayItemDescription.pointStrokeSameAsFill}
        onChange={(checked) => {
          displayItemDescription.applyModelChange(
            () => displayItemDescription.setPointStrokeSameAsFill(checked),
            {
              undoStringKey: "DG.Undo.graph.changeStrokeColor",
              redoStringKey: "DG.Redo.graph.changeStrokeColor",
              log: "Changed stroke color"
            }
          )
        }}
      >
        {() => (
          <>
            <div className="checkbox-indicator" />
            {t("DG.Inspector.strokeSameAsFill")}
          </>
        )}
      </Checkbox>

      <If condition={!!(onBackgroundTransparencyChange && onBackgroundColorChange)}>
        <PlotBackgroundControls
          isTransparent={isTransparent}
          onBackgroundTransparencyChange={onBackgroundTransparencyChange!}
          plotBackgroundColor={plotBackgroundColor}
          onBackgroundColorChange={onBackgroundColorChange!}
        />
      </If>
    </div>
  )
})
