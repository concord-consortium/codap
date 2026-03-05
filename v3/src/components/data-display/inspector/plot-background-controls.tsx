import { clsx } from "clsx"
import { t } from "../../../utilities/translation/translate"
import { PaletteCheckbox } from "../../palette-checkbox"
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
      <div className={clsx("palette-row", "color-picker-row", { disabled: isTransparent })}
        aria-disabled={isTransparent || undefined}>
        <label className="form-label color-picker">{t("DG.Inspector.backgroundColor")}</label>
        <PointColorSetting propertyLabel={t("DG.Inspector.backgroundColor")}
                          disabled={isTransparent}
                          onColorChange={(color) => onBackgroundColorChange(color)}
                          swatchBackgroundColor={plotBackgroundColor ?? "#FFFFFF"}/>
      </div>
      <PaletteCheckbox
        isSelected={isTransparent}
        onChange={onBackgroundTransparencyChange}
        data-testid="background-transparency-checkbox"
      >
        {t("DG.Inspector.graphTransparency")}
      </PaletteCheckbox>
    </div>
  )
}
