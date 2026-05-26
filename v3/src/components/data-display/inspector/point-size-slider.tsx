import { observer } from "mobx-react-lite"
import { Label, Slider, SliderThumb, SliderTrack } from "react-aria-components"
import { useTileModelContext } from "../../../hooks/use-tile-model-context"
import { t } from "../../../utilities/translation/translate"
import { changePointSizeNotification } from "../data-display-notifications"
import { PointDisplayType } from "../data-display-types"
import { IDisplayItemDescriptionModel } from "../models/display-item-description-model"

interface IPointSizeSliderProps {
  displayItemDescription: IDisplayItemDescriptionModel
  pointDisplayType?: PointDisplayType
}

export const PointSizeSlider = observer(function PointSizeSlider(
  { displayItemDescription, pointDisplayType }: IPointSizeSliderProps
) {
  const { tile } = useTileModelContext()
  return (
    <Slider
      minValue={0}
      maxValue={2}
      step={0.01}
      defaultValue={displayItemDescription.pointSizeMultiplier}
      onChange={(val: number) => displayItemDescription.setDynamicPointSizeMultiplier(val)}
      onChangeEnd={(val: number) => {
        displayItemDescription.applyModelChange(
          () => displayItemDescription.setPointSizeMultiplier(val),
          {
            notify: () => changePointSizeNotification(tile, val),
            undoStringKey: "DG.Undo.graph.changePointSize",
            redoStringKey: "DG.Redo.graph.changePointSize",
            log: "Changed point size"
          }
        )
      }}
      isDisabled={pointDisplayType === "bars"}
      data-testid="point-size-slider"
    >
      <div className="palette-row slider-row">
        <Label className="form-label">{t("DG.Inspector.pointSize")}</Label>
        <SliderTrack>
          <SliderThumb />
        </SliderTrack>
      </div>
    </Slider>
  )
})
