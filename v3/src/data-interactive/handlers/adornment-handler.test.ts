import { CountAdornmentModel } from "../../components/graph/adornments/count/count-adornment-model"
import { diAdornmentHandler } from "./adornment-handler"

describe("DataInteractive AdornmentHandler", () => {
  const handler = diAdornmentHandler
  const countAdornment = CountAdornmentModel.create({
    id: "ADRN123",
    isVisible: false,
    percentType: "row",
    showCount: false,
    showPercent: false,
    type: "Count"
  })

  it("get works as expected when provided with an adornment", () => {  
    const result = handler.get?.({ adornment: countAdornment })
    const { success, values } = result || {}
    const getValue = (key: string) => {
      return (values && typeof values === "object" && key in values) ? (values as Record<string, any>)[key] : undefined
    }
    expect(success).toBe(true)
    expect(getValue("id")).toBe(countAdornment.id)
    expect(getValue("type")).toBe(countAdornment.type)
    expect(getValue("isVisible")).toBe(countAdornment.isVisible)
  })

  it("get returns an error when no adornment provided", () => {
    const result = handler.get?.({})
    expect(result?.success).toBe(false)
  })

})
