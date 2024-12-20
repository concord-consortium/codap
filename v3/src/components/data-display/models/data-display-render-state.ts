import { graphSnaphsot } from "../../graph/utilities/image-utils"
import { PixiPointsArray } from "../pixi/pixi-points"

export class DataDisplayRenderState {
  pixiPointsArray: PixiPointsArray | undefined
  displayElement: HTMLElement | undefined
  getTitle: (() => string | undefined) | undefined
  dataUri: string | undefined

  constructor(
    pixiPointsArray: PixiPointsArray,
    displayElement: HTMLElement,
    getTitle?: () => string,
    dataUri?: string
  ) {
    this.pixiPointsArray = pixiPointsArray
    this.displayElement = displayElement
    this.getTitle = getTitle
    this.dataUri = dataUri
  }

  setDataUri(dataUri: string) {
    this.dataUri = dataUri
  }

  async updateSnapshot() {
    const title = this.getTitle?.() || ""
    const pixiPoints = this.pixiPointsArray?.[0]
    if (!this.displayElement || !pixiPoints) return

    const width = this.displayElement.getBoundingClientRect().width ?? 0
    const height = this.displayElement.getBoundingClientRect().height ?? 0
    const svgElementsToImageOptions = {
      rootEl: this.displayElement,
      graphWidth: width,
      graphHeight: height,
      graphTitle: title,
      asDataURL: true,
      pixiPoints
    }
    const graphImage = await graphSnaphsot(svgElementsToImageOptions)
    const dataUri = typeof graphImage === "string" ? graphImage : undefined
    if (dataUri) {
      this.setDataUri(dataUri)
    }
  }
}
