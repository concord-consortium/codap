import { ISecondaryAxisRange, RegionOfInterestAdornmentModel } from "./region-of-interest-adornment-model"

describe("RegionOfInterestAdornmentModel", () => {
  it("should create an instance", () => {
    const model = RegionOfInterestAdornmentModel.create()
    expect(model).toBeTruthy()
  })

  it("should set primary axis range", () => {
    const primaryProp = { position: 0, extent: "100%" }
    const model = RegionOfInterestAdornmentModel.create()
    model.setPrimary(primaryProp)
    expect(model.primary).toEqual(primaryProp)
  })

  it("should set secondary axis range", () => {
    const secondaryProp = { position: 0, extent: "100%", axis: "y" } as ISecondaryAxisRange
    const model = RegionOfInterestAdornmentModel.create()
    model.setSecondary(secondaryProp)
    expect(model.secondary).toEqual(secondaryProp)
  })
})
