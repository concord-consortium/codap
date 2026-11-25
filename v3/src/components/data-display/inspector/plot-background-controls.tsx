import { clsx } from "clsx"
import { t } from "../../../utilities/translation/translate"
import { ColorSetting } from "../../common/color-setting"
import { PaletteCheckbox } from "../../palette-checkbox"

interface IPlotBackgroundControlsProps {
  disabled?: boolean
  isTransparent?: boolean
  onBackgroundTransparencyChange: (isTransparent: boolean) => void
  plotBackgroundColor?: string
  onBackgroundColorChange: (color: string) => void
}

export function PlotBackgroundControls(
  { disabled, isTransparent, onBackgroundTransparencyChange, plotBackgroundColor, onBackgroundColorChange }
  : IPlotBackgroundControlsProps
) {
  const colorDisabled = disabled || isTransparent

  return (
    <div>
      <div className={clsx("palette-row", "color-picker-row", { disabled: colorDisabled })}
        aria-disabled={colorDisabled || undefined}>
        <label className="form-label color-picker">{t("DG.Inspector.backgroundColor")}</label>
        <ColorSetting propertyLabel={t("DG.Inspector.backgroundColor")} testIdSuffix="background"
                          disabled={colorDisabled}
                          onColorChange={(color) => onBackgroundColorChange(color)}
                          swatchBackgroundColor={plotBackgroundColor ?? "#FFFFFF"}/>
      </div>
      <PaletteCheckbox
        isDisabled={disabled}
        isSelected={isTransparent}
        onChange={onBackgroundTransparencyChange}
        data-testid="background-transparency-checkbox"
      >
        {t("DG.Inspector.graphTransparency")}
      </PaletteCheckbox>
    </div>
  )
}
