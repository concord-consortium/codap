import { CountAdornmentModel } from "./count-adornment-model"

describe("CountAdornmentModel", () => {
  it("is created with its type property set to 'Count'", () => {
    const count = CountAdornmentModel.create()
    expect(count.type).toEqual("Count")
  })
})
