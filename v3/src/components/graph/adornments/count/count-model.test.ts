import { CountModel } from "./count-model"

describe("CountModel", () => {
  it("is created with its type property set to 'Count'", () => {
    const count = CountModel.create()
    expect(count.type).toEqual("Count")
  })
})
