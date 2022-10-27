import {determineBaseString} from "./use-drop-hint-string"

const numericToEmptyAxis = { placeString: "x", dropType: "numeric", existingType: undefined }
const numericToPopulatedAxis = { placeString: "x", dropType: "numeric", existingType: "numeric" }
const categoricalToPlot = { placeString: "legend", dropType: "categorical", existingType: "categorical" }

describe("determineBaseString should return correct string key for potential plot drops", () => {
  it("returns key for numeric attr to empty axis", () => {
    const { placeString, dropType, existingType } = numericToEmptyAxis
    const result = determineBaseString(placeString, dropType, existingType as any)
    expect(result).toEqual("DG.GraphView.addToEmptyPlace")
  })
  it("returns key for numeric attr to populated axis", () => {
    const { placeString, dropType, existingType } = numericToPopulatedAxis
    const result = determineBaseString(placeString, dropType, existingType)
    expect(result).toEqual("DG.GraphView.replaceAttribute")
  })
  it("returns key for attr to legend", () => {
    const { placeString, dropType, existingType } = categoricalToPlot
    const result = determineBaseString(placeString, dropType, existingType)
    expect(result).toEqual("DG.GraphView.dropInPlot")
  })
})
