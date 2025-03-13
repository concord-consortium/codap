import { IAdornmentModel } from "../../components/graph/adornments/adornment-models"
import { diAdornmentListHandler } from "./adornment-list-handler"

describe("DataInteractive AdornmentListHandler", () => {
  const handler = diAdornmentListHandler
  const adornment1 = { "id": "ADRN123", "type": "Count", "isVisible": false } as unknown as IAdornmentModel
  const adornment2 = { "id": "ADRN456", "type": "Median", "isVisible": true } as unknown as IAdornmentModel
  const adornment3 = { "id": "ADRN789", "type": "Mean", "isVisible": true } as unknown as IAdornmentModel
  const adornmentList = [adornment1, adornment2, adornment3]

  it("get works as expected when provided with an adornment list", () => {  
    const result = handler.get?.({ adornmentList })
    expect(result?.success).toBe(true)
    const values = result?.values as any[]
    expect(values.length).toBe(3)
    expect(values[0].id).toBe(adornment1.id)
    expect(values[0].type).toBe(adornment1.type)
    expect(values[0].isVisible).toBe(adornment1.isVisible)
    expect(values[1].id).toBe(adornment2.id)
    expect(values[1].type).toBe(adornment2.type)
    expect(values[1].isVisible).toBe(adornment2.isVisible)
    expect(values[2].id).toBe(adornment3.id)
    expect(values[2].type).toBe(adornment3.type)
    expect(values[2].isVisible).toBe(adornment3.isVisible)
  })

  it("get returns an error when no adornment list provided", () => {
    const result = handler.get?.({})
    expect(result?.success).toBe(false)
  })
})
