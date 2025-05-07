/**
 * GeoImage represents a single geographic image and provides methods to process it.
 */
export class GeoImage {
  private img?: HTMLImageElement
  private canvas?: HTMLCanvasElement
  private ctx?: CanvasRenderingContext2D
  private imageData?: Uint8ClampedArray<ArrayBufferLike>

  /**
   * Loads an image from a URL
   * @param url - The URL to load the image from
   * @returns Promise resolving to this GeoImage instance for chaining
   */
  public async loadFromUrl(url: string): Promise<GeoImage> {
    return new Promise((resolve, reject) => {
      this.img = new Image()
      this.img.crossOrigin = "anonymous" // Required for canvas operations
      this.img.onload = () => resolve(this)
      this.img.onerror = () => reject(new Error(`Failed to load image ${url}`))
      this.img.src = url
    })
  }

  public get width(): number {
    if (!this.img) {
      throw new Error("Image not loaded")
    }
    // Ensure the image is loaded and has dimensions
    if (!this.img.complete || !this.img.naturalWidth || !this.img.naturalHeight) {
      throw new Error("Image not fully loaded or has invalid dimensions")
    }
    return this.img.naturalWidth
  }

  public get height(): number {
    if (!this.img) {
      throw new Error("Image not loaded")
    }
    // Ensure the image is loaded and has dimensions
    if (!this.img.complete || !this.img.naturalWidth || !this.img.naturalHeight) {
      throw new Error("Image not fully loaded or has invalid dimensions")
    }
    return this.img.naturalHeight
  }

  public prepare() {
    if (!this.img) {
      throw new Error("Image not loaded")
    }

    // Ensure the image is loaded and has dimensions
    if (!this.img.complete || !this.img.naturalWidth || !this.img.naturalHeight) {
      throw new Error("Image not fully loaded or has invalid dimensions")
    }

    // Create canvas and imageData on first use
    if (!this.canvas || !this.ctx || !this.imageData) {
      this.canvas = document.createElement("canvas")
      this.canvas.width = this.img.naturalWidth
      this.canvas.height = this.img.naturalHeight
      const ctx = this.canvas.getContext("2d")
      if (!ctx) {
        throw new Error("Failed to get canvas context")
      }
      this.ctx = ctx
      // Draw image to canvas only once
      this.ctx.drawImage(this.img, 0, 0)

      this.imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height).data
    }

  }

  public getColorAt(x: number, y: number) {
    // Get pixel data
    const start = (y * this.canvas!.width + x) * 4
    const imageData = this.imageData!
    return `rgb(${imageData[start]},${imageData[start+1]},${imageData[start+2]})`
  }
}
