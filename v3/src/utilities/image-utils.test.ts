import {
  downscaleImageFile, fileToDataUrl, getImageDimensions,
  MAX_IMAGE_FILE_DIMENSION, MAX_IMAGE_HEIGHT, MAX_IMAGE_WIDTH
} from "./image-utils"

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

  describe("fileToDataUrl", () => {
    it("converts a File object to a data URL", async () => {
      const blob = new Blob(["test image data"], { type: "image/png" })
      const file = new File([blob], "test-image.png", { type: "image/png" })

      const dataUrl = await fileToDataUrl(file)

      expect(dataUrl).toMatch(/^data:image\/png;base64,/)
      expect(typeof dataUrl).toBe("string")
    })

    it("preserves the file's MIME type in the data URL", async () => {
      const jpegBlob = new Blob(["jpeg data"], { type: "image/jpeg" })
      const jpegFile = new File([jpegBlob], "test.jpg", { type: "image/jpeg" })

      const dataUrl = await fileToDataUrl(jpegFile)

      expect(dataUrl).toMatch(/^data:image\/jpeg;base64,/)
    })

    it("rejects the promise when file reading fails", async () => {
      const file = new File(["test"], "test.png", { type: "image/png" })

      // Mock FileReader to simulate error
      const originalFileReader = global.FileReader
      const mockFileReader = jest.fn().mockImplementation(() => {
        const instance = {
          readAsDataURL: jest.fn(function(this: any) {
            setTimeout(() => this.onerror?.(), 0)
          }),
          onerror: null as any,
          onload: null as any,
          result: null
        }
        return instance
      })

      // @ts-expect-error - testing error condition
      global.FileReader = mockFileReader

      try {
        await expect(fileToDataUrl(file)).rejects.toThrow("Failed to read file: test.png")
      } finally {
        global.FileReader = originalFileReader
      }
    })

    it("handles different image formats", async () => {
      const formats = [
        { type: "image/png", mime: "image/png" },
        { type: "image/jpeg", mime: "image/jpeg" },
        { type: "image/gif", mime: "image/gif" },
        { type: "image/webp", mime: "image/webp" }
      ]

      for (const format of formats) {
        const blob = new Blob(["data"], { type: format.type })
        const file = new File([blob], "test", { type: format.type })

        const dataUrl = await fileToDataUrl(file)

        expect(dataUrl).toMatch(new RegExp(`^data:${format.mime};base64,`))
      }
    })
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

  describe("downscaleImageFile", () => {
    let originalFileReader: typeof FileReader

    beforeEach(() => {
      originalFileReader = global.FileReader

      // @ts-expect-error - testing
      global.FileReader = class MockFileReader {
        readAsDataURL(file: any) {
          // Simulate async file reading
          setTimeout(() => {
            this.result = "data:image/png;base64,mockdata"
            this.onload?.()
          }, 0)
        }
        result: string | ArrayBuffer | null = null
        onload: (() => void) | null = null
        onerror: (() => void) | null = null
      }
    })

    afterEach(() => {
      global.FileReader = originalFileReader
    })

    it("returns original data URL for small images", async () => {
      const blob = new Blob(["small image"], { type: "image/png" })
      const file = new File([blob], "small.png", { type: "image/png" })

      const promise = downscaleImageFile(file)

      // Simulate Image loading with small dimensions
      setTimeout(() => {
        if (mockImageInstance) {
          mockImageInstance.naturalWidth = 200
          mockImageInstance.naturalHeight = 200
          mockImageInstance.triggerLoad()
        }
      }, 0)

      const result = await promise
      expect(result).toMatch(/^data:/)
    })

    it("Down-scales images larger than MAX_IMAGE_FILE_DIMENSION", async () => {
      const blob = new Blob(["large image"], { type: "image/jpeg" })
      const file = new File([blob], "large.jpg", { type: "image/jpeg" })

      // Mock canvas
      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: jest.fn(() => ({
          drawImage: jest.fn()
        })),
        toBlob: jest.fn((callback: BlobCallback) => {
          setTimeout(() => {
            callback(new Blob(["downscaled"], { type: "image/png" }))
          }, 0)
        })
      }

      const originalCreateElement = document.createElement
      document.createElement = jest.fn((tag: string) => {
        if (tag === "canvas") return mockCanvas as any
        return originalCreateElement.call(document, tag)
      })

      try {
        const promise = downscaleImageFile(file)

        // Simulate Image loading with large dimensions
        setTimeout(() => {
          if (mockImageInstance) {
            mockImageInstance.naturalWidth = 1024
            mockImageInstance.naturalHeight = 1024
            mockImageInstance.triggerLoad()
          }
        }, 0)

        const result = await promise
        expect(result).toMatch(/^data:/)
        expect(mockCanvas.toBlob).toHaveBeenCalled()
        // Verify canvas was sized to fit within MAX_IMAGE_FILE_DIMENSION
        expect(mockCanvas.width).toBeLessThanOrEqual(MAX_IMAGE_FILE_DIMENSION)
        expect(mockCanvas.height).toBeLessThanOrEqual(MAX_IMAGE_FILE_DIMENSION)
      } finally {
        document.createElement = originalCreateElement
      }
    })

    it("maintains aspect ratio when downscaling", async () => {
      const blob = new Blob(["wide image"], { type: "image/png" })
      const file = new File([blob], "wide.png", { type: "image/png" })

      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: jest.fn(() => ({
          drawImage: jest.fn()
        })),
        toBlob: jest.fn((callback: BlobCallback) => {
          setTimeout(() => {
            callback(new Blob(["downscaled"], { type: "image/png" }))
          }, 0)
        })
      }

      const originalCreateElement = document.createElement
      document.createElement = jest.fn((tag: string) => {
        if (tag === "canvas") return mockCanvas as any
        return originalCreateElement.call(document, tag)
      })

      try {
        const promise = downscaleImageFile(file)

        // Simulate Image loading with 2:1 aspect ratio (wide image)
        setTimeout(() => {
          if (mockImageInstance) {
            mockImageInstance.naturalWidth = 1024
            mockImageInstance.naturalHeight = 512
            mockImageInstance.triggerLoad()
          }
        }, 0)

        await promise
        // With 2:1 ratio and max dimension 512, should be 512x256
        expect(mockCanvas.width).toBe(512)
        expect(mockCanvas.height).toBe(256)
      } finally {
        document.createElement = originalCreateElement
      }
    })

    it("chooses smaller of original vs downscaled versions", async () => {
      const blob = new Blob(["test"], { type: "image/jpeg" })
      const file = new File([blob], "test.jpg", { type: "image/jpeg" })

      // Create a custom FileReader mock that tracks calls
      let fileReaderCallCount = 0
      // @ts-expect-error - testing
      global.FileReader = class MockFileReader {
        readAsDataURL(fileOrBlob: any) {
          fileReaderCallCount++
          setTimeout(() => {
            // First call returns original, second call returns downscaled
            if (fileReaderCallCount === 1) {
              this.result = `data:image/jpeg;base64,${'x'.repeat(1000)}` // Simulate larger original
            } else {
              this.result = `data:image/png;base64,${'y'.repeat(500)}` // Simulate smaller downscaled
            }
            this.onload?.()
          }, 0)
        }
        result: string | ArrayBuffer | null = null
        onload: (() => void) | null = null
        onerror: (() => void) | null = null
      }

      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: jest.fn(() => ({
          drawImage: jest.fn()
        })),
        toBlob: jest.fn((callback: BlobCallback) => {
          setTimeout(() => {
            callback(new Blob(["downscaled"], { type: "image/png" }))
          }, 0)
        })
      }

      const originalCreateElement = document.createElement
      document.createElement = jest.fn((tag: string) => {
        if (tag === "canvas") return mockCanvas as any
        return originalCreateElement.call(document, tag)
      })

      try {
        const promise = downscaleImageFile(file)

        // Simulate Image loading with dimensions requiring downscaling
        setTimeout(() => {
          if (mockImageInstance) {
            mockImageInstance.naturalWidth = 2000
            mockImageInstance.naturalHeight = 2000
            mockImageInstance.triggerLoad()
          }
        }, 0)

        const result = await promise
        // Should return the smaller downscaled version
        expect(result).toContain("y".repeat(500))
        expect(result).not.toContain("x".repeat(1000))
      } finally {
        global.FileReader = originalFileReader
        document.createElement = originalCreateElement
      }
    })

    it("prefers original if it's smaller than downscaled", async () => {
      const blob = new Blob(["test"], { type: "image/jpeg" })
      const file = new File([blob], "test.jpg", { type: "image/jpeg" })

      let fileReaderCallCount = 0
      // @ts-expect-error - testing
      global.FileReader = class MockFileReader {
        readAsDataURL(fileOrBlob: any) {
          fileReaderCallCount++
          setTimeout(() => {
            // First call returns original (smaller), second call returns downscaled (larger)
            if (fileReaderCallCount === 1) {
              this.result = `data:image/jpeg;base64,${'x'.repeat(300)}` // Smaller original
            } else {
              this.result = `data:image/png;base64,${'y'.repeat(800)}` // Larger downscaled
            }
            this.onload?.()
          }, 0)
        }
        result: string | ArrayBuffer | null = null
        onload: (() => void) | null = null
        onerror: (() => void) | null = null
      }

      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: jest.fn(() => ({
          drawImage: jest.fn()
        })),
        toBlob: jest.fn((callback: BlobCallback) => {
          setTimeout(() => {
            callback(new Blob(["downscaled"], { type: "image/png" }))
          }, 0)
        })
      }

      const originalCreateElement = document.createElement
      document.createElement = jest.fn((tag: string) => {
        if (tag === "canvas") return mockCanvas as any
        return originalCreateElement.call(document, tag)
      })

      try {
        const promise = downscaleImageFile(file)

        // Simulate Image loading with dimensions requiring downscaling
        setTimeout(() => {
          if (mockImageInstance) {
            mockImageInstance.naturalWidth = 2000
            mockImageInstance.naturalHeight = 2000
            mockImageInstance.triggerLoad()
          }
        }, 0)

        const result = await promise
        // Should return the smaller original version
        expect(result).toContain("x".repeat(300))
        expect(result).not.toContain("y".repeat(800))
      } finally {
        global.FileReader = originalFileReader
        document.createElement = originalCreateElement
      }
    })

    it("rejects promise when FileReader fails", async () => {
      const blob = new Blob(["test"], { type: "image/png" })
      const file = new File([blob], "test.png", { type: "image/png" })

      // @ts-expect-error - testing
      global.FileReader = class MockFileReader {
        readAsDataURL() {
          setTimeout(() => {
            this.onerror?.()
          }, 0)
        }
        result: string | ArrayBuffer | null = null
        onload: (() => void) | null = null
        onerror: (() => void) | null = null
      }

      await expect(downscaleImageFile(file)).rejects.toThrow("Failed to read file")
    })

    it("rejects promise when Image fails to load", async () => {
      const blob = new Blob(["test"], { type: "image/png" })
      const file = new File([blob], "test.png", { type: "image/png" })

      const promise = downscaleImageFile(file)

      // Simulate Image load failure
      setTimeout(() => {
        if (mockImageInstance) {
          mockImageInstance.triggerError()
        }
      }, 0)

      await expect(promise).rejects.toThrow("Failed to load image")
    })

    it("uses PNG format for downscaled images", async () => {
      const blob = new Blob(["test"], { type: "image/jpeg" })
      const file = new File([blob], "test.jpg", { type: "image/jpeg" })

      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: jest.fn(() => ({
          drawImage: jest.fn()
        })),
        toBlob: jest.fn((callback: BlobCallback, type?: string, quality?: number) => {
          // Verify PNG format is requested
          expect(type).toBe("image/png")
          expect(quality).toBe(1)
          setTimeout(() => {
            callback(new Blob(["downscaled"], { type: "image/png" }))
          }, 0)
        })
      }

      const originalCreateElement = document.createElement
      document.createElement = jest.fn((tag: string) => {
        if (tag === "canvas") return mockCanvas as any
        return originalCreateElement.call(document, tag)
      })

      try {
        const promise = downscaleImageFile(file)

        setTimeout(() => {
          if (mockImageInstance) {
            mockImageInstance.naturalWidth = 1024
            mockImageInstance.naturalHeight = 1024
            mockImageInstance.triggerLoad()
          }
        }, 0)

        await promise
        expect(mockCanvas.toBlob).toHaveBeenCalledWith(expect.any(Function), "image/png", 1)
      } finally {
        document.createElement = originalCreateElement
      }
    })

    it("MAX_IMAGE_FILE_DIMENSION is set to 512", () => {
      expect(MAX_IMAGE_FILE_DIMENSION).toBe(512)
    })
  })

  describe("detectDataUrlImageBug", () => {
    let mockCanvas: any
    let originalCreateElement: typeof document.createElement
    let originalWindowImage: typeof Image

    beforeEach(() => {
      jest.resetModules()
      originalCreateElement = document.createElement
      originalWindowImage = window.Image

      // Default mock canvas that works correctly
      mockCanvas = {
        width: 0,
        height: 0,
        getContext: jest.fn(() => ({
          fillStyle: "",
          fillRect: jest.fn(),
          drawImage: jest.fn(),
          getImageData: jest.fn(() => ({
            data: new Uint8ClampedArray([255, 0, 0, 255]) // Red pixel
          }))
        }))
      }

      document.createElement = jest.fn((tag: string) => {
        if (tag === "canvas") return mockCanvas
        return originalCreateElement.call(document, tag)
      })

      // Mock Image that auto-triggers onload when src is set
      // @ts-expect-error - intentionally replacing Image for testing
      window.Image = class MockImageAutoLoad {
        private _src = ""
        onload: (() => void) | null = null
        onerror: (() => void) | null = null
        naturalWidth = 8
        naturalHeight = 8

        get src() { return this._src }
        set src(value: string) {
          this._src = value
          // Auto-trigger onload in next microtask
          Promise.resolve().then(() => this.onload?.())
        }
      }
    })

    afterEach(() => {
      document.createElement = originalCreateElement
      window.Image = originalWindowImage
    })

    it("returns false when image renders correctly (red pixel detected)", async () => {
      const { detectDataUrlImageBug: detect } = await import("./image-utils")

      const result = await detect()
      expect(result).toBe(false)
    })

    it("returns true when pixel is not red (bug detected)", async () => {
      // Mock canvas that returns black pixel (simulating the bug)
      mockCanvas.getContext = jest.fn(() => ({
        fillStyle: "",
        fillRect: jest.fn(),
        drawImage: jest.fn(),
        getImageData: jest.fn(() => ({
          data: new Uint8ClampedArray([0, 0, 0, 255]) // Black pixel - bug!
        }))
      }))

      const { detectDataUrlImageBug: detect } = await import("./image-utils")

      const result = await detect()
      expect(result).toBe(true)
    })

    it("returns true when getImageData throws (Safari security restriction)", async () => {
      // Mock canvas that throws on getImageData (simulating Safari)
      mockCanvas.getContext = jest.fn(() => ({
        fillStyle: "",
        fillRect: jest.fn(),
        drawImage: jest.fn(),
        getImageData: jest.fn(() => {
          throw new Error("SecurityError: The operation is insecure")
        })
      }))

      const { detectDataUrlImageBug: detect } = await import("./image-utils")

      const result = await detect()
      expect(result).toBe(true)
    })

    it("returns false when canvas context is not available", async () => {
      mockCanvas.getContext = jest.fn(() => null)

      const { detectDataUrlImageBug: detect } = await import("./image-utils")

      const result = await detect()
      expect(result).toBe(false)
    })

    it("caches result after first detection", async () => {
      const { detectDataUrlImageBug: detect, hasDataUrlImageBug: hasBug } = await import("./image-utils")

      expect(hasBug()).toBe(null) // Not yet detected

      const result1 = await detect()
      expect(hasBug()).toBe(result1) // Now cached

      const result2 = await detect()
      expect(result1).toBe(result2)
    })
  })

  describe("hasDataUrlImageBug", () => {
    let originalWindowImage: typeof Image
    let originalCreateElement: typeof document.createElement

    beforeEach(() => {
      jest.resetModules()
      originalWindowImage = window.Image
      originalCreateElement = document.createElement

      // Mock Image that auto-triggers onload when src is set
      // @ts-expect-error - intentionally replacing Image for testing
      window.Image = class MockImageAutoLoad {
        private _src = ""
        onload: (() => void) | null = null
        onerror: (() => void) | null = null
        naturalWidth = 8
        naturalHeight = 8

        get src() { return this._src }
        set src(value: string) {
          this._src = value
          Promise.resolve().then(() => this.onload?.())
        }
      }
    })

    afterEach(() => {
      window.Image = originalWindowImage
      document.createElement = originalCreateElement
    })

    it("returns null before detection has run", async () => {
      const { hasDataUrlImageBug: hasBug } = await import("./image-utils")
      expect(hasBug()).toBe(null)
    })

    it("returns cached value after detection", async () => {
      document.createElement = jest.fn((tag: string) => {
        if (tag === "canvas") {
          return {
            width: 0,
            height: 0,
            getContext: jest.fn(() => ({
              fillStyle: "",
              fillRect: jest.fn(),
              drawImage: jest.fn(),
              getImageData: jest.fn(() => ({
                data: new Uint8ClampedArray([255, 0, 0, 255])
              }))
            }))
          }
        }
        return originalCreateElement.call(document, tag)
      }) as typeof document.createElement

      const { detectDataUrlImageBug: detect, hasDataUrlImageBug: hasBug } = await import("./image-utils")

      await detect()
      expect(hasBug()).toBe(false)
    })
  })
})
