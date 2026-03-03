import { clsx } from "clsx"
import { Checkbox } from "react-aria-components"
import { t } from "../../../utilities/translation/translate"
import { PointColorSetting } from "./point-color-setting"

interface IPlotBackgroundControlsProps {
  isTransparent?: boolean
  onBackgroundTransparencyChange: (isTransparent: boolean) => void
  plotBackgroundColor?: string
  onBackgroundColorChange: (color: string) => void
}

export function PlotBackgroundControls(
  { isTransparent, onBackgroundTransparencyChange, plotBackgroundColor, onBackgroundColorChange }
  : IPlotBackgroundControlsProps
) {
  return (
    <div>
      <div className={clsx("palette-row", "color-picker-row", { disabled: isTransparent })}>
        <label className="form-label color-picker">{t("DG.Inspector.backgroundColor")}</label>
        <PointColorSetting propertyLabel={t("DG.Inspector.backgroundColor")}
                          onColorChange={(color) => onBackgroundColorChange(color)}
                          swatchBackgroundColor={plotBackgroundColor ?? "#FFFFFF"}/>
      </div>
      <Checkbox
        isSelected={isTransparent}
        onChange={onBackgroundTransparencyChange}
        data-testid="background-transparency-checkbox"
      >
        {() => (
          <>
            <div className="checkbox-indicator" />
            {t("DG.Inspector.graphTransparency")}
          </>
        )}
      </Checkbox>
    </div>
  )
}
