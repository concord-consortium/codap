export const ColorPickerPaletteElements = {
  getColorPalette() {
    return cy.get(".color-picker-palette")
  },
  getCategoricalColorSettingsGroup() {
    return cy.get(".cat-color-setting")
  },
  getCategoricalColorSettingRow() {
    return cy.get(".cat-color-setting .color-picker-row.cat-color-picker")
  },
  getCategoricalColorSettingLabel() {
    return cy.get(".cat-color-setting .form-label.color-picker")
  },
  getCategoricalColorSettingButton() {
    return cy.get(".cat-color-setting .color-picker-thumb")
  },
  getCategoricalColorSettingSwatch() {
    return cy.get(".cat-color-setting .color-picker-thumb-swatch")
  },
  getColorSettingSwatchGrid() {
    return cy.get(".color-swatch-grid")
  },
  getColorSettingSwatchCell() {
    return cy.get(".color-swatch-cell")
  },
  getSelectedSwatchCell() {
    return cy.get("[data-selected]")
  },
  getColorPickerToggleButton() {
    return cy.get("[data-testid=toggle-show-color-picker-button]")
  },
  getColorPicker() {
    return cy.get(".color-picker-container")
  },
  getColorPickerSaturation() {
    return cy.get(".react-colorful__saturation .react-colorful__interactive")
  },
  getColorPickerHue() {
    return cy.get(".react-colorful__hue .react-colorful__interactive")
  },
  getSetColorButton() {
    return cy.get(".color-picker-action-button:not(.cancel)")
  },
  getCancelColorButton() {
    return cy.get(".color-picker-action-button.cancel")
  },
  getColorPickerPopover() {
    return cy.get(".color-picker-popover")
  }
}
