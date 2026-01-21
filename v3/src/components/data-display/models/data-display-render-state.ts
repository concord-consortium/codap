import { graphSnapshot, IGraphSvgOptions } from "../../graph/utilities/image-utils"
import { PointRendererArray } from "../renderer"

export class DataDisplayRenderState {
  rendererArray: PointRendererArray
  displayElement: HTMLElement
  dataUri?: string

  constructor(
    rendererArray: PointRendererArray,
    displayElement: HTMLElement,
    dataUri?: string
  ) {
    this.rendererArray = rendererArray
    this.displayElement = displayElement
    this.dataUri = dataUri
  }

  setDataUri(dataUri: string) {
    this.dataUri = dataUri
  }

  get imageOptions(): IGraphSvgOptions | undefined {
    const renderer = this.rendererArray?.[0]
    if (!this.displayElement || !renderer) return

    const width = this.displayElement.getBoundingClientRect().width ?? 0
    const height = this.displayElement.getBoundingClientRect().height ?? 0
    return {
      rootEl: this.displayElement,
      graphWidth: width,
      graphHeight: height,
      renderer
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
