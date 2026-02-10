import { graphSnapshot, IGraphImageOptions, IGraphSnapshotResult } from "../../graph/utilities/image-utils"
import { PointRendererArray } from "../renderer"

export interface ISnapshotResult {
  dataUri: string
  width: number
  height: number
}

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

  get imageOptions(): IGraphImageOptions | undefined {
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

  async updateSnapshot(dpr?: number, title?: string): Promise<ISnapshotResult | undefined> {
    const { imageOptions } = this
    if (!imageOptions) return

    const result: IGraphSnapshotResult = await graphSnapshot({ ...imageOptions, asDataURL: true, dpr, title })
    const dataUri = typeof result.image === "string" ? result.image : undefined
    if (dataUri) {
      this.setDataUri(dataUri)
      return { dataUri, width: result.width, height: result.height }
    }
  }
}
