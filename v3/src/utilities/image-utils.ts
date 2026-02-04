// Maximum dimensions for initially-loaded images (in pixels)
export const MAX_IMAGE_WIDTH = 800
export const MAX_IMAGE_HEIGHT = 600

// Maximum dimension for file size control (prevents bloated data URLs from huge images)
export const MAX_IMAGE_FILE_DIMENSION = 512

export interface ImageDimensions {
  width: number
  height: number
}

/**
 * Detect if the browser has a bug rendering data URLs in <img> elements.
 * This bug exists in Safari on macOS 26 where data URLs load (onload fires)
 * but don't render pixels correctly.
 *
 * Detection works by:
 * 1. Loading a small 8x8 test PNG (red pixels) via data URL in an <img>
 * 2. Drawing that <img> to a canvas
 * 3. Reading pixel data to verify it rendered correctly
 *
 * Result is cached after first detection.
 */
let dataUrlBugDetected: boolean | null = null
let dataUrlBugDetectionPromise: Promise<boolean> | null = null

// 8x8 solid red (#FF0000) PNG for testing data URL rendering
const TEST_IMAGE_RED_8X8 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAB" +
  "GdBTUEAALGPC/xhBQAAAAlwSFlzAAAOwgAADsIBFShKgAAAABl0RVh0U29mdHdhcmUAcGFp" +
  "bnQubmV0IDQuMC4xNkRpr/UAAAAdSURBVChTY/jPwPCfgREK/jMw/GdgRAJEA4b/DABnCQ" +
  "MJMJX3OQAAAABJRU5ErkJggg=="

export function detectDataUrlImageBug(): Promise<boolean> {
  // Return cached result if available
  if (dataUrlBugDetected !== null) {
    return Promise.resolve(dataUrlBugDetected)
  }

  // Return existing detection promise if in progress
  if (dataUrlBugDetectionPromise) {
    return dataUrlBugDetectionPromise
  }

  dataUrlBugDetectionPromise = new Promise((resolve) => {
    const img = new Image()

    img.onload = () => {
      try {
        // Draw the loaded image to a canvas
        const canvas = document.createElement("canvas")
        canvas.width = 8
        canvas.height = 8
        const ctx = canvas.getContext("2d")

        if (!ctx) {
          dataUrlBugDetected = false
          resolve(false)
          return
        }

        // Clear to black first so we can detect if nothing renders
        ctx.fillStyle = "#000000"
        ctx.fillRect(0, 0, 8, 8)

        // Draw the test image
        ctx.drawImage(img, 0, 0)

        // Read pixel data from center of image
        const imageData = ctx.getImageData(4, 4, 1, 1)
        const [r, g, b, a] = imageData.data

        // Check if the pixel is approximately red (allowing some tolerance)
        // If the bug exists, pixels will likely be black (0,0,0) or transparent
        const isRedish = r > 200 && g < 50 && b < 50 && a > 200

        dataUrlBugDetected = !isRedish
        resolve(!isRedish)
      } catch (e) {
        // If we can't read canvas data (e.g., Safari security restrictions),
        // assume the bug might exist and use canvas fallback to be safe
        dataUrlBugDetected = true
        resolve(true)
      }
    }

    img.onerror = () => {
      dataUrlBugDetected = false
      resolve(false)
    }

    // Note: Do NOT set crossOrigin for data URLs - it causes Safari to taint the canvas
    img.src = TEST_IMAGE_RED_8X8
  })

  return dataUrlBugDetectionPromise
}

// Synchronous check - returns null if detection hasn't completed yet
export function hasDataUrlImageBug(): boolean | null {
  return dataUrlBugDetected
}

/**
 * Convert a File object to a data URL.
 * Data URLs contain the encoded image data and can be safely serialized,
 * unlike object URLs which are ephemeral browser references.
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve(reader.result as string)
    }
    reader.onerror = () => {
      reject(new Error(`Failed to read file: ${file.name}`))
    }
    reader.readAsDataURL(file)
  })
}

/**
 * Load an image from a URL and extract its natural dimensions.
 * Returns { width, height } scaled to fit within MAX dimensions while preserving aspect ratio.
 * If the image fails to load, returns half of the maximum dimensions as fallback.
 */
export function getImageDimensions(imageUrl: string): Promise<ImageDimensions> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      let { naturalWidth: width, naturalHeight: height } = img

      // Scale down if image exceeds maximum dimensions while preserving aspect ratio
      if (width > MAX_IMAGE_WIDTH || height > MAX_IMAGE_HEIGHT) {
        const widthScale = MAX_IMAGE_WIDTH / width
        const heightScale = MAX_IMAGE_HEIGHT / height
        const scale = Math.min(widthScale, heightScale)
        width = Math.round(width * scale)
        height = Math.round(height * scale)
      }

      resolve({ width, height })
    }
    img.onerror = () => {
      // If image fails to load, use default dimensions (half the max)
      resolve({ width: MAX_IMAGE_WIDTH / 2, height: MAX_IMAGE_HEIGHT / 2 })
    }
    img.src = imageUrl
  })
}

/**
 * Downscale an image file so that its largest dimension is at most MAX_IMAGE_FILE_DIMENSION pixels.
 * This prevents data URLs from bloating with huge image files while maintaining quality.
 * For large images, compares the original data URL with the downscaled PNG version and returns
 * whichever is smaller, optimizing for both quality and file size.
 */
export function downscaleImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const originalDataUrl = reader.result as string
      const img = new Image()
      img.onload = () => {
        const { naturalWidth: width, naturalHeight: height } = img

        // If image is already small enough, use the original data URL
        if (width <= MAX_IMAGE_FILE_DIMENSION && height <= MAX_IMAGE_FILE_DIMENSION) {
          resolve(originalDataUrl)
          return
        }

        // Calculate scale factor to fit within MAX_IMAGE_FILE_DIMENSION
        const scale = MAX_IMAGE_FILE_DIMENSION / Math.max(width, height)
        const newWidth = Math.round(width * scale)
        const newHeight = Math.round(height * scale)

        // Create canvas and draw scaled image
        const canvas = document.createElement("canvas")
        canvas.width = newWidth
        canvas.height = newHeight
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("Failed to get canvas context"))
          return
        }

        // Use high quality settings for best output
        ctx.drawImage(img, 0, 0, newWidth, newHeight)

        // Convert canvas to PNG data URL for quality preservation
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to create blob from canvas"))
              return
            }
            const downscaledReader = new FileReader()
            downscaledReader.onload = () => {
              const downscaledDataUrl = downscaledReader.result as string
              // Compare sizes and use the smaller of the two
              const originalSize = originalDataUrl.length
              const downscaledSize = downscaledDataUrl.length
              resolve(downscaledSize < originalSize ? downscaledDataUrl : originalDataUrl)
            }
            downscaledReader.onerror = () => {
              reject(new Error(`Failed to read downscaled image: ${file.name}`))
            }
            downscaledReader.readAsDataURL(blob)
          },
          "image/png", // Use PNG for lossless quality
          1 // Maximum quality
        )
      }
      img.onerror = () => {
        reject(new Error(`Failed to load image: ${file.name}`))
      }
      img.src = originalDataUrl
    }
    reader.onerror = () => {
      reject(new Error(`Failed to read file: ${file.name}`))
    }
    reader.readAsDataURL(file)
  })
}
