import { textToSlate } from "@concord-consortium/slate-editor"
import { isTextModel, TextModel } from "./text-model"

describe("TextModel", () => {
  it("works as expected", () => {
    const model = TextModel.create()
    expect(isTextModel(undefined)).toBe(false)
    expect(isTextModel(model)).toBe(true)
    expect(model.textContent).toBe("")
    expect(model.isEquivalent(textToSlate(model.textContent))).toBe(true)
    model.setTextContent("Some text")
    expect(model.textContent).toBe("Some text")
    expect(model.isEquivalent(textToSlate(model.textContent))).toBe(true)
  })
})
