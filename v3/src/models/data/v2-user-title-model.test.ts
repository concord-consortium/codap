import { V2UserTitleModel } from "./v2-user-title-model"

describe("V2UserTitleModel", () => {
  it("should create a model with a user-settable title", () => {
    const model = V2UserTitleModel.create({ name: "Title" })
    expect(model._title).toBeUndefined()
    expect(model.title).toBe("Title")
    expect(model.userSetTitle).toBeUndefined()
    model.setUserTitle("User Title")
    expect(model.title).toBe("User Title")
    expect(model.userSetTitle).toBe(true)
  })
})
