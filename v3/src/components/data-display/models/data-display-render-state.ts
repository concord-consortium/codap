import { graphSnapshot, IGraphSvgOptions } from "../../graph/utilities/image-utils"
import { PixiPointsArray } from "../pixi/pixi-points"

export class DataDisplayRenderState {
  pixiPointsArray: PixiPointsArray
  displayElement: HTMLElement
  dataUri?: string

  constructor(
    pixiPointsArray: PixiPointsArray,
    displayElement: HTMLElement,
    dataUri?: string
  ) {
    this.pixiPointsArray = pixiPointsArray
    this.displayElement = displayElement
    this.dataUri = dataUri
  }

  setDataUri(dataUri: string) {
    this.dataUri = dataUri
  }

  get imageOptions(): IGraphSvgOptions | undefined {
    const pixiPoints = this.pixiPointsArray?.[0]
    if (!this.displayElement || !pixiPoints) return

    const width = this.displayElement.getBoundingClientRect().width ?? 0
    const height = this.displayElement.getBoundingClientRect().height ?? 0
    return {
      rootEl: this.displayElement,
      graphWidth: width,
      graphHeight: height,
      pixiPoints
    }
  }

  async updateSnapshot() {
    const { imageOptions } = this
    if (!imageOptions) return

    const graphImage = await graphSnapshot({ ...imageOptions, asDataURL: true })
    const dataUri = typeof graphImage === "string" ? graphImage : undefined
    if (dataUri) {
      this.setDataUri(dataUri)
    }
  }
}
