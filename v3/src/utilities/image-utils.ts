// Maximum dimensions for initially-loaded images (in pixels)
export const MAX_IMAGE_WIDTH = 800
export const MAX_IMAGE_HEIGHT = 600

export interface ImageDimensions {
  width: number
  height: number
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
