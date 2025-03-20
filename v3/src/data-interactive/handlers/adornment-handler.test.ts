import { IAdornmentModel } from "../../components/graph/adornments/adornment-models"
import { DIResources } from "../data-interactive-types"
import { diAdornmentHandler } from "./adornment-handler"

describe("DataInteractive AdornmentHandler", () => {
  const handler = diAdornmentHandler

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

})
