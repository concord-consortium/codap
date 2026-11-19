import { clsx } from "clsx"
import { Button, Key, Label, ListBox, ListBoxItem, Popover, Select, SelectValue } from "react-aria-components"
import { t } from "../../../../utilities/translation/translate"
import {
  getHotSpotRampGradient, HotSpotColorRamp, HotSpotColorRamps, isHotSpotColorRamp
} from "../../utilities/hot-spot-color-ramps"

interface IProps {
  colorRamp: HotSpotColorRamp
  // The ends of the custom ramp, shown in its preview strip
  lowColor: string
  highColor: string
  isDisabled?: boolean
  onColorRampChange: (colorRamp: HotSpotColorRamp) => void
}

export function ColorRampSelect({ colorRamp, lowColor, highColor, isDisabled, onColorRampChange }: IProps) {
  const handleSelectionChange = (key: Key | null) => {
    if (isHotSpotColorRamp(key) && key !== colorRamp) onColorRampChange(key)
  }

  const renderRamp = (ramp: HotSpotColorRamp) => (
    <>
      <span
        className="hot-spot-ramp-strip"
        // The strip is decorative: the option's text is its accessible name.
        aria-hidden="true"
        style={{ background: getHotSpotRampGradient(ramp, lowColor, highColor) }}
      />
      {t(`V3.Inspector.map.hotSpotColorRamp.${ramp}`)}
    </>
  )

  return (
    <Select
      className={clsx("react-aria-Select palette-row color-ramp-row", { disabled: isDisabled })}
      selectedKey={colorRamp}
      onSelectionChange={handleSelectionChange}
      isDisabled={isDisabled}
      data-testid="map-hot-spot-color-ramp-select"
    >
      <Label className="form-label">{t("V3.Inspector.map.hotSpotColorRamp")}</Label>
      <Button data-testid="map-hot-spot-color-ramp-button">
        <SelectValue />
        <span aria-hidden="true" className="select-arrow">▾</span>
      </Button>
      <Popover
        className="react-aria-Popover hot-spot-color-ramp-popover"
        data-testid="map-hot-spot-color-ramp-popover"
      >
        <ListBox>
          {HotSpotColorRamps.map(ramp =>
            <ListBoxItem key={ramp} id={ramp} textValue={t(`V3.Inspector.map.hotSpotColorRamp.${ramp}`)}>
              {renderRamp(ramp)}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </Select>
  )
}
