import { IAdornmentModel } from "../../components/graph/adornments/adornment-models"
import { DIResources } from "../data-interactive-types"
import { diAdornmentHandler } from "./adornment-handler"

describe("DataInteractive AdornmentHandler", () => {
  const handler = diAdornmentHandler

  it("create returns an error when no values provided", () => {
    const result = handler.create?.({})
    expect(result?.success).toBe(false)
  })

  it("delete returns an error when no type provided", () => {
    const result = handler.delete?.({})
    expect(result?.success).toBe(false)
  })

  it("delete returns an error when type provided but matching adornment not found", () => {
    const result = handler.delete?.({}, { type: "Count" })
    expect(result?.success).toBe(false)
  })

  it("get returns an error when no adornment provided", () => {
    const result = handler.get?.({})
    expect(result?.success).toBe(false)
  })

  it("get returns an error when the specified adornment is not active", () => {
    const mockAdornment = {
      id: "ADRN123",
      isVisible: false,
      type: "Count"
    } as IAdornmentModel
    const mockResource: DIResources = { adornment: mockAdornment }
    const result = handler.get?.(mockResource)
    expect(result?.success).toBe(false)
  })

  it("update returns an error when no values provided", () => {
    const result = handler.update?.({})
    expect(result?.success).toBe(false)
  })

  it("update returns an error when type provided but matching adornment not found", () => {
    const mockGraphContent = {
      adornmentsStore: {
        addAdornment: jest.fn((adornment: any, options: any) => null),
        findAdornmentOfType: jest.fn(),
      },
      type: "Graph"
    } as any

    const mockComponent = {
      content: mockGraphContent,
      type: "Graph",
    } as any

    const result = handler.update?.({component: mockComponent}, { type: "Mean" })
    expect(result?.success).toBe(false)
    const values = result?.values as any
    expect(values.error).toBe("Adornment not found.")
  })

})
