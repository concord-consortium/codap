import { DIResources, DIUpdateConfigurationValue } from "../data-interactive-types"
import { diConfigurationHandler } from "./configuration-handler"
import * as mstDocumentUtils from "../../utilities/mst-document-utils"

jest.mock("../../utilities/mst-document-utils")

describe("DataInteractive ConfigurationHandler", () => {
  const handler = diConfigurationHandler
  let mockDocumentContent: any

  beforeEach(() => {
    mockDocumentContent = {
      gaussianFitEnabled: false,
      setGaussianFitEnabled: jest.fn()
    }
    ;(mstDocumentUtils.getDocumentContentFromNode as jest.Mock).mockReturnValue(
      mockDocumentContent
    )
  })

  describe("get", () => {
    it("returns success false when configuration is not provided", () => {
      const resources: DIResources = { interactiveFrame: {} as any }
      const result = handler.get?.(resources)
      expect(result).toEqual({ success: false, values: { error: 'unknown configuration "undefined"' } })
    })

    it("returns success false for unknown configuration", () => {
      const resources: DIResources = {
        interactiveFrame: {} as any,
        configuration: "unknownConfig"
      }
      const result = handler.get?.(resources)
      expect(result).toEqual({ success: false, values: { error: 'unknown configuration "unknownConfig"' } })
    })

    it("returns undefined when interactiveFrame is not provided", () => {
      ;(mstDocumentUtils.getDocumentContentFromNode as jest.Mock).mockReturnValue(undefined)
      const resources: DIResources = { configuration: "gaussianFitEnabled" }
      const result = handler.get?.(resources)
      expect(result).toEqual({ success: false, values: { error: 'Interactive Frame not found' } })
    })

    it("gets gaussianFitEnabled configuration when enabled", () => {
      mockDocumentContent.gaussianFitEnabled = true

      const resources: DIResources = {
        interactiveFrame: {} as any,
        configuration: "gaussianFitEnabled"
      }
      const result = handler.get?.(resources)
      expect(result).toEqual({ success: true, values: { name: "gaussianFitEnabled", value: "yes" } })
    })

    it("gets gaussianFitEnabled configuration when disabled", () => {
      mockDocumentContent.gaussianFitEnabled = false

      const resources: DIResources = {
        interactiveFrame: {} as any,
        configuration: "gaussianFitEnabled"
      }
      const result = handler.get?.(resources)
      expect(result).toEqual({ success: true, values: { name: "gaussianFitEnabled", value: "" } })
    })

    it("returns name in the result values", () => {
      mockDocumentContent.gaussianFitEnabled = true

      const resources: DIResources = {
        interactiveFrame: {} as any,
        configuration: "gaussianFitEnabled"
      }
      const result = handler.get?.(resources)
      expect(result).toEqual({ success: true, values: { name: "gaussianFitEnabled", value: "yes" } })
    })
  })

  describe("update", () => {
    it("returns valuesRequired error when values are not provided", () => {
      const resources: DIResources = {
        interactiveFrame: {} as any,
        configuration: "gaussianFitEnabled"
      }
      const result = handler.update?.(resources)
      expect(result?.success).toBe(false)
      expect(result?.values).toHaveProperty("error")
    })

    it("returns valuesRequired error when values are undefined", () => {
      const resources: DIResources = {
        interactiveFrame: {} as any,
        configuration: "gaussianFitEnabled"
      }
      const result = handler.update?.(resources, undefined)
      expect(result?.success).toBe(false)
      expect(result?.values).toHaveProperty("error")
    })

    it("returns success false for unknown configuration", () => {
      const resources: DIResources = {
        interactiveFrame: {} as any,
        configuration: "unknownConfig"
      }
      const values: DIUpdateConfigurationValue = { value: "yes" }
      const result = handler.update?.(resources, values)
      expect(result).toEqual({ success: false, values: { error: 'unknown configuration "unknownConfig"' } })
    })

    it("sets gaussianFitEnabled to true when value is 'yes'", () => {
      mockDocumentContent.gaussianFitEnabled = false

      const resources: DIResources = {
        interactiveFrame: {} as any,
        configuration: "gaussianFitEnabled"
      }
      const values: DIUpdateConfigurationValue = { value: "yes" }
      const result = handler.update?.(resources, values)
      expect(result).toEqual({ success: true })
      expect(mockDocumentContent.setGaussianFitEnabled).toHaveBeenCalledWith(true)
    })

    it("sets gaussianFitEnabled to false when value is not 'yes'", () => {
      mockDocumentContent.gaussianFitEnabled = true

      const resources: DIResources = {
        interactiveFrame: {} as any,
        configuration: "gaussianFitEnabled"
      }
      const values: DIUpdateConfigurationValue = { value: "no" }
      const result = handler.update?.(resources, values)
      expect(result).toEqual({ success: true })
      expect(mockDocumentContent.setGaussianFitEnabled).toHaveBeenCalledWith(false)
    })

    it("sets gaussianFitEnabled to false when value is undefined", () => {
      mockDocumentContent.gaussianFitEnabled = true

      const resources: DIResources = {
        interactiveFrame: {} as any,
        configuration: "gaussianFitEnabled"
      }
      const values: DIUpdateConfigurationValue = { value: undefined }
      const result = handler.update?.(resources, values)
      expect(result).toEqual({ success: true })
      expect(mockDocumentContent.setGaussianFitEnabled).toHaveBeenCalledWith(false)
    })

    it("returns success false when interactiveFrame is not provided", () => {
      ;(mstDocumentUtils.getDocumentContentFromNode as jest.Mock).mockReturnValue(undefined)
      const resources: DIResources = { configuration: "gaussianFitEnabled" }
      const values: DIUpdateConfigurationValue = { value: "yes" }
      const result = handler.update?.(resources, values)
      expect(result).toEqual({ success: false, values: { error: 'Interactive Frame not found' } })
    })
  })

  describe("integration", () => {
    it("get and update work together correctly", () => {
      const resources: DIResources = {
        interactiveFrame: {} as any,
        configuration: "gaussianFitEnabled"
      }

      // Initially disabled
      mockDocumentContent.gaussianFitEnabled = false
      let result = handler.get?.(resources)
      expect(result).toEqual({ success: true, values: { name: "gaussianFitEnabled", value: "" } })

      // Update to enabled
      let updateResult = handler.update?.(resources, { value: "yes" })
      expect(updateResult).toEqual({ success: true })
      expect(mockDocumentContent.setGaussianFitEnabled).toHaveBeenCalledWith(true)

      // Verify state change
      mockDocumentContent.gaussianFitEnabled = true
      result = handler.get?.(resources)
      expect(result).toEqual({ success: true, values: { name: "gaussianFitEnabled", value: "yes" } })

      // Update to disabled
      updateResult = handler.update?.(resources, { value: "no" })
      expect(updateResult).toEqual({ success: true })
      expect(mockDocumentContent.setGaussianFitEnabled).toHaveBeenCalledWith(false)

      // Verify state change
      mockDocumentContent.gaussianFitEnabled = false
      result = handler.get?.(resources)
      expect(result).toEqual({ success: true, values: { name: "gaussianFitEnabled", value: "" } })
    })
  })
})
