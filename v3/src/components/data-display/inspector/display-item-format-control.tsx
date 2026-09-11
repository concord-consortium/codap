import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import { ReactNode, useId } from "react"
import { Radio, RadioGroup } from "react-aria-components"
import { useTileModelContext } from "../../../hooks/use-tile-model-context"
import { isFeatureEnabled } from "../../../models/feature-flags/feature-flag-manager"
import { t } from "../../../utilities/translation/translate"
import { If } from "../../common/if"
import { PaletteCheckbox } from "../../palette-checkbox"
import { IMapPointLayerModel, isMapPointDisplayType } from "../../map/models/map-point-layer-model"
import {
  changeStrokeColorAndAlphaNotification, toggleStrokeSameAsFillNotification
} from "../data-display-notifications"
import { PointDisplayType } from "../data-display-types"
import { IDataConfigurationModel } from "../models/data-configuration-model"
import { IDisplayItemDescriptionModel } from "../models/display-item-description-model"
import {
  LegendBinCountInput, LegendBinsSelect, LegendColorControls, LegendRangeInputs
} from "./legend-color-controls"
import { PlotBackgroundControls } from "./plot-background-controls"
import { PointColorSetting } from "./point-color-setting"
import { PointSizeSlider } from "./point-size-slider"

import "./display-item-format-control.scss"

interface IPaletteSectionProps {
  title?: string
  children: ReactNode
}

// Groups controls under a heading when given a title, and renders them bare otherwise.
function PaletteSection({ title, children }: IPaletteSectionProps) {
  const titleId = useId()

  if (!title) return <>{children}</>

  return (
    <section className="palette-section" aria-labelledby={titleId}>
      <h3 className="palette-section-title" id={titleId}>{title}</h3>
      {children}
    </section>
  )
}

interface IDisplayItemFormatControlProps {
  dataConfiguration: IDataConfigurationModel
  displayItemDescription: IDisplayItemDescriptionModel
  mapPointLayerModel?: IMapPointLayerModel
  pointDisplayType?: PointDisplayType
  isTransparent?: boolean
  onBackgroundTransparencyChange?: (isTransparent: boolean) => void
  plotBackgroundColor?: string
  onBackgroundColorChange?: (color: string) => void
  // The map layers palette omits this: it repeats these controls per layer under the layer's own
  // name, so a heading inside each would be noise.
  showSectionHeaders?: boolean
}

export const DisplayItemFormatControl = observer(function DisplayItemFormatControl(
  props: IDisplayItemFormatControlProps
) {
  const {
    dataConfiguration, displayItemDescription, mapPointLayerModel, pointDisplayType,
    isTransparent, onBackgroundTransparencyChange, plotBackgroundColor, onBackgroundColorChange,
    showSectionHeaders
  } = props
  const { tile } = useTileModelContext()
  const legendAttrID = dataConfiguration.attributeID("legend")
  const attrType = dataConfiguration.attributeType("legend")
  const dataPointsTitle = showSectionHeaders ? t("V3.Inspector.section.dataPoints") : undefined
  const graphTitle = showSectionHeaders ? t("V3.Inspector.section.graph") : undefined

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
        notify: () => changeStrokeColorAndAlphaNotification(tile, color),
        undoStringKey: "DG.Undo.graph.changeStrokeColor",
        redoStringKey: "DG.Redo.graph.changeStrokeColor",
        log: "Changed stroke color"
      }
    )
  }

  return (
    <div className="palette-form">
      <PaletteSection title={dataPointsTitle}>
        <If condition={!!(mapPointLayerModel && legendAttrID)}>
          <RadioGroup
            value={mapPointLayerModel?.displayType}
            onChange={handlePointTypeChange}
            aria-label={t("V3.map.inspector.displayType")}
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

        <If condition={!displayItemDescription.isPolygon}>
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
          <If condition={isFeatureEnabled("legendBinCount")}>
            <LegendBinCountInput dataConfiguration={dataConfiguration} />
          </If>
          <If condition={isFeatureEnabled("legendRange")}>
            <LegendRangeInputs dataConfiguration={dataConfiguration} />
          </If>
        </If>

        <div className={clsx("stroke-section", { disabled: displayItemDescription.pointStrokeSameAsFill })}
          aria-disabled={displayItemDescription.pointStrokeSameAsFill || undefined}>
          <div className="palette-row color-picker-row">
            <label className="form-label color-picker">{t("DG.Inspector.stroke")}</label>
            <PointColorSetting propertyLabel={t("DG.Inspector.stroke")}
                              disabled={displayItemDescription.pointStrokeSameAsFill}
                              onColorChange={(color) => handlePointStrokeColorChange(color)}
                              swatchBackgroundColor={displayItemDescription.pointStrokeColor}/>
          </div>
        </div>
        <PaletteCheckbox
          data-testid="stroke-same-as-fill-checkbox"
          isSelected={displayItemDescription.pointStrokeSameAsFill}
          onChange={(checked) => {
            displayItemDescription.applyModelChange(
              () => displayItemDescription.setPointStrokeSameAsFill(checked),
              {
                notify: () => toggleStrokeSameAsFillNotification(tile, checked),
                undoStringKey: "DG.Undo.graph.changeStrokeColor",
                redoStringKey: "DG.Redo.graph.changeStrokeColor",
                log: "Changed stroke color"
              }
            )
          }}
        >
          {t("DG.Inspector.strokeSameAsFill")}
        </PaletteCheckbox>
      </PaletteSection>

      <If condition={!!(onBackgroundTransparencyChange && onBackgroundColorChange)}>
        <PaletteSection title={graphTitle}>
          <PlotBackgroundControls
            isTransparent={isTransparent}
            onBackgroundTransparencyChange={onBackgroundTransparencyChange!}
            plotBackgroundColor={plotBackgroundColor}
            onBackgroundColorChange={onBackgroundColorChange!}
          />
        </PaletteSection>
      </If>
    </div>
  )
})
