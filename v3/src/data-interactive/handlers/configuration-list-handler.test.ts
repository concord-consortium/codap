import { DIResources } from "../data-interactive-types"
import { diConfigurationListHandler } from "./configuration-list-handler"
import * as mstUtils from "../../utilities/mst-utils"

jest.mock("../../utilities/mst-utils")

describe("DataInteractive ConfigurationListHandler", () => {
  const handler = diConfigurationListHandler

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("get", () => {
    it("returns list with gaussianFitEnabled as 'yes' when enabled", () => {
      ;(mstUtils.getDocumentContentPropertyFromNode as jest.Mock).mockReturnValue(true)

      const resources: DIResources = { interactiveFrame: {} as any }
      const result = handler.get?.(resources)

      expect(result).toEqual({
        success: true,
        values: [
          {
            name: "gaussianFitEnabled",
            value: "yes"
          }
        ]
      })
      expect(mstUtils.getDocumentContentPropertyFromNode).toHaveBeenCalledWith(
        resources.interactiveFrame,
        "gaussianFitEnabled"
      )
    })

    it("returns list with gaussianFitEnabled as empty string when disabled", () => {
      ;(mstUtils.getDocumentContentPropertyFromNode as jest.Mock).mockReturnValue(false)

      const resources: DIResources = { interactiveFrame: {} as any }
      const result = handler.get?.(resources)

      expect(result).toEqual({
        success: true,
        values: [
          {
            name: "gaussianFitEnabled",
            value: ""
          }
        ]
      })
      expect(mstUtils.getDocumentContentPropertyFromNode).toHaveBeenCalledWith(
        resources.interactiveFrame,
        "gaussianFitEnabled"
      )
    })

    it("returns list with gaussianFitEnabled as empty string when property is undefined", () => {
      ;(mstUtils.getDocumentContentPropertyFromNode as jest.Mock).mockReturnValue(undefined)

      const resources: DIResources = { interactiveFrame: {} as any }
      const result = handler.get?.(resources)

      expect(result).toEqual({
        success: true,
        values: [
          {
            name: "gaussianFitEnabled",
            value: ""
          }
        ]
      })
    })

    it("returns list with gaussianFitEnabled as empty string when property is null", () => {
      ;(mstUtils.getDocumentContentPropertyFromNode as jest.Mock).mockReturnValue(null)

      const resources: DIResources = { interactiveFrame: {} as any }
      const result = handler.get?.(resources)

      expect(result).toEqual({
        success: true,
        values: [
          {
            name: "gaussianFitEnabled",
            value: ""
          }
        ]
      })
    })

    it("works without interactiveFrame provided", () => {
      ;(mstUtils.getDocumentContentPropertyFromNode as jest.Mock).mockReturnValue(undefined)

      const resources: DIResources = {}
      const result = handler.get?.(resources)

      expect(result).toEqual({
        success: true,
        values: [
          {
            name: "gaussianFitEnabled",
            value: ""
          }
        ]
      })
      expect(mstUtils.getDocumentContentPropertyFromNode).toHaveBeenCalledWith(
        undefined,
        "gaussianFitEnabled"
      )
    })

    it("always returns success true with array of configurations", () => {
      ;(mstUtils.getDocumentContentPropertyFromNode as jest.Mock).mockReturnValue(true)

      const resources: DIResources = { interactiveFrame: {} as any }
      const result = handler.get?.(resources)

      expect(result?.success).toBe(true)
      expect(Array.isArray(result?.values)).toBe(true)
      expect(result?.values).toHaveLength(1)
    })
  })
})
