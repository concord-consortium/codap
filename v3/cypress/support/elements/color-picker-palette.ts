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
  getColorSettingPalette() {
    return cy.get(".color-picker-palette-container")
  },
  getColorSettingSwatchGrid() {
    return cy.get(".color-swatch-grid")
  },
  getColorSettingSwatchCell() {
    return cy.get(".color-swatch-cell")
  },
  getColorSettingSwatchRow() {
    return cy.get(".color-swatch-row")
  },
  getSelectedSwatchCell() {
    return cy.get(".selected")
  },
  getColorPickerToggleButton() {
    return cy.get(".color-swatch-footer [data-testid=toggle-show-color-picker-button]")
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
    return cy.get(".color-picker-footer .set-color-button")
  },
  getCancelColorButton() {
    return cy.get(".color-picker-footer .cancel-button")
  }
}
