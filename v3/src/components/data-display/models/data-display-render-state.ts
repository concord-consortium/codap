import { captureSVGElementsToImage } from "../../graph/utilities/image-utils"
import { PixiPointsArray } from "../pixi/pixi-points"

export class DataDisplayRenderState {
  pixiPointsArray: PixiPointsArray | undefined
  displayElement: HTMLElement | undefined
  getTitle: (() => string | undefined) | undefined
  dataUri: string | undefined

  constructor(pixiPointsArray: PixiPointsArray, displayElement: HTMLElement, getTitle: () => string | undefined) {
    this.pixiPointsArray = pixiPointsArray
    this.displayElement = displayElement
    this.getTitle = getTitle
  }

  setDataUri(dataUri: string) {
    console.log("DataDisplayRenderState setDataUri")
    this.dataUri = dataUri
  }

  async updateSnapshot() {
    console.log("DataDisplayRenderState updateSnapshot")
    const title = this.getTitle?.() || ""
    const pixiPoints = this.pixiPointsArray?.[0]
    console.log("displayElement", this.displayElement)
    console.log("pixiPoints", pixiPoints)
    if (!this.displayElement || !pixiPoints) return

    const width = this.displayElement.getBoundingClientRect().width ?? 0
    const height = this.displayElement.getBoundingClientRect().height ?? 0
    const graphImage = await captureSVGElementsToImage(this.displayElement, width, height, title, true, pixiPoints)
    const dataUri = typeof graphImage === "string" ? graphImage : undefined
    console.log("dataUri", dataUri)
    if (dataUri) {
      this.setDataUri(dataUri)
    }
  }
}
