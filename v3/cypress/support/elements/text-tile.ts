import { ComponentElements as c } from "./component-elements"

export const kTextTileTestId = "codap-text"
export const kTextContentClass = ".codap-text-content"

export const TextTileElements = {
  getTextTile() {
    return c.getComponentTile(kTextTileTestId)
  },
  getTextTileContent() {
    return cy.get(kTextContentClass)
  },
  getTextTileEditor() {
    return cy.get(".slate-editor")
  },
  focusEditor() {
    return this.getTextTileEditor().focus()
  },
  blurEditor() {
    return this.getTextTileEditor().blur()
  },
  typeText(text: string) {
    this.getTextTileEditor().type(text)
  }
}
