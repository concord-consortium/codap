import { RegionOfInterestAdornmentModel, RoiUnitValueModel }
  from "./region-of-interest-adornment-model"

describe("RegionOfInterestAdornmentModel", () => {
  it("should create an instance", () => {
    const model = RegionOfInterestAdornmentModel.create()
    expect(model).toBeTruthy()
  })

  it("should set height", () => {
    const model = RegionOfInterestAdornmentModel.create()
    model.setHeight(100)
    expect(model.height).toBe(100)
  })

  it("should set width", () => {
    const model = RegionOfInterestAdornmentModel.create()
    model.setWidth(100)
    expect(model.width).toBe(100)
  })

  it("should set position", () => {
    const xPosition = RoiUnitValueModel.create({ unit: "coordinate", value: 100 })
    const yPosition = RoiUnitValueModel.create({ unit: "coordinate", value: 150 })
    const model = RegionOfInterestAdornmentModel.create()
    model.setPosition(xPosition, yPosition)
    expect(model.xPosition).toBe(xPosition)
    expect(model.yPosition).toBe(yPosition)
  })

  it("should set size", () => {
    const model = RegionOfInterestAdornmentModel.create()
    model.setSize(100, 150)
    expect(model.width).toBe(100)
    expect(model.height).toBe(150)
  })
})
