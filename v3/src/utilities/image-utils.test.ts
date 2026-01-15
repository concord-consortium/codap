import { getImageDimensions, MAX_IMAGE_HEIGHT, MAX_IMAGE_WIDTH } from "./image-utils"

// Mock the Image constructor
class MockImage {
  src: string = ""
  onload: (() => void) | null = null
  onerror: (() => void) | null = null

  constructor(
    public naturalWidth = 800,
    public naturalHeight = 600
  ) {}

  // Simulate image loading
  triggerLoad() {
    setTimeout(() => this.onload?.(), 0)
  }

  triggerError() {
    setTimeout(() => this.onerror?.(), 0)
  }
}

describe("image-utils", () => {
  let originalImage: typeof Image
  let mockImageInstance: MockImage | undefined

  beforeEach(() => {
    originalImage = window.Image
    // @ts-expect-error - intentionally replacing Image for testing
    window.Image = class extends MockImage {
      constructor() {
        super()
        mockImageInstance = this as unknown as MockImage
      }
    }
  })

  afterEach(() => {
    window.Image = originalImage
  })

  describe("getImageDimensions", () => {
    it("returns natural image dimensions for normal-sized images", async () => {
      const promise = getImageDimensions("test.jpg")

      // Simulate image load with 640x480 dimensions
      setTimeout(() => {
        if (mockImageInstance) {
          mockImageInstance.naturalWidth = 640
          mockImageInstance.naturalHeight = 480
          mockImageInstance.triggerLoad()
        }
      }, 0)

      const dimensions = await promise
      expect(dimensions).toEqual({ width: 640, height: 480 })
    })

    it("sets src correctly before loading", async () => {
      const testUrl = "https://example.com/image.jpg"
      const promise = getImageDimensions(testUrl)

      expect(mockImageInstance?.src).toBe(testUrl)

      // Complete the promise
      if (mockImageInstance) {
        mockImageInstance.naturalWidth = 100
        mockImageInstance.naturalHeight = 100
        mockImageInstance.triggerLoad()
      }

      await promise
    })

    it("scales down images larger than MAX_IMAGE_WIDTH", async () => {
      const promise = getImageDimensions("large.jpg")

      setTimeout(() => {
        if (mockImageInstance) {
          // 1600x1200 should scale to 800x600 (4:3 aspect ratio)
          mockImageInstance.naturalWidth = 1600
          mockImageInstance.naturalHeight = 1200
          mockImageInstance.triggerLoad()
        }
      }, 0)

      const dimensions = await promise
      expect(dimensions).toEqual({ width: 800, height: 600 })
    })

    it("scales down images larger than MAX_IMAGE_HEIGHT", async () => {
      const promise = getImageDimensions("tall.jpg")

      setTimeout(() => {
        if (mockImageInstance) {
          // 600x1600 should scale to 225x600 (preserving aspect ratio)
          mockImageInstance.naturalWidth = 600
          mockImageInstance.naturalHeight = 1600
          mockImageInstance.triggerLoad()
        }
      }, 0)

      const dimensions = await promise
      // Scale factor is 600/1600 = 0.375, so 600 * 0.375 = 225
      expect(dimensions.width).toBe(225)
      expect(dimensions.height).toBe(600)
    })

    it("scales down oversized images while preserving aspect ratio", async () => {
      const promise = getImageDimensions("oversized.jpg")

      setTimeout(() => {
        if (mockImageInstance) {
          // 4000x3000 (4:3 ratio) should scale to 800x600
          mockImageInstance.naturalWidth = 4000
          mockImageInstance.naturalHeight = 3000
          mockImageInstance.triggerLoad()
        }
      }, 0)

      const dimensions = await promise
      expect(dimensions).toEqual({ width: 800, height: 600 })

      // Verify aspect ratio is preserved: 800/600 = 4000/3000 = 1.333...
      expect(dimensions.width / dimensions.height).toBeCloseTo(4000 / 3000, 5)
    })

    it("uses fallback dimensions (400x300) when image fails to load", async () => {
      const promise = getImageDimensions("broken.jpg")

      setTimeout(() => {
        if (mockImageInstance) {
          mockImageInstance.triggerError()
        }
      }, 0)

      const dimensions = await promise
      expect(dimensions).toEqual({
        width: MAX_IMAGE_WIDTH / 2,
        height: MAX_IMAGE_HEIGHT / 2
      })
      expect(dimensions).toEqual({ width: 400, height: 300 })
    })

    it("handles blob URLs correctly", async () => {
      const blobUrl = "blob:https://example.com/12345"
      const promise = getImageDimensions(blobUrl)

      expect(mockImageInstance?.src).toBe(blobUrl)

      setTimeout(() => {
        if (mockImageInstance) {
          mockImageInstance.naturalWidth = 200
          mockImageInstance.naturalHeight = 200
          mockImageInstance.triggerLoad()
        }
      }, 0)

      const dimensions = await promise
      expect(dimensions).toEqual({ width: 200, height: 200 })
    })

    it("rounds scaled dimensions to integers", async () => {
      const promise = getImageDimensions("uneven.jpg")

      setTimeout(() => {
        if (mockImageInstance) {
          // 1000x750 should scale to something with rounded dimensions
          mockImageInstance.naturalWidth = 1000
          mockImageInstance.naturalHeight = 750
          mockImageInstance.triggerLoad()
        }
      }, 0)

      const dimensions = await promise
      expect(Number.isInteger(dimensions.width)).toBe(true)
      expect(Number.isInteger(dimensions.height)).toBe(true)
    })

    it("handles edge case where width exceeds max but height does not", async () => {
      const promise = getImageDimensions("wide.jpg")

      setTimeout(() => {
        if (mockImageInstance) {
          // 1600x300 should scale based on width constraint
          mockImageInstance.naturalWidth = 1600
          mockImageInstance.naturalHeight = 300
          mockImageInstance.triggerLoad()
        }
      }, 0)

      const dimensions = await promise
      // Scale factor is 800/1600 = 0.5
      expect(dimensions.width).toBe(800)
      expect(dimensions.height).toBe(150)
    })

    it("handles edge case where height exceeds max but width does not", async () => {
      const promise = getImageDimensions("tall.jpg")

      setTimeout(() => {
        if (mockImageInstance) {
          // 300x1600 should scale based on height constraint
          mockImageInstance.naturalWidth = 300
          mockImageInstance.naturalHeight = 1600
          mockImageInstance.triggerLoad()
        }
      }, 0)

      const dimensions = await promise
      // Scale factor is 600/1600 = 0.375
      // 300 * 0.375 = 112.5, which rounds to 113 (Math.round behavior)
      expect(dimensions.width).toBe(113)
      expect(dimensions.height).toBe(600)
    })
  })
})
