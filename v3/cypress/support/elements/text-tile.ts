import { ComponentElements as c } from "./component-elements"

export const kTextTileTestId = "codap-text"
export const kTextContentClass = ".codap-text-content"

export const TextTileElements = {
  getTextTile() {
    return c.getComponentTile(kTextTileTestId)
  },
  getTextTileContent() {
    return cy.get(kTextContentClass)
  }
}
