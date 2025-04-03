// import { RegionOfInterestAdornmentModel, RoiUnitValueModel }
//   from "./region-of-interest-adornment-model"

// describe("RegionOfInterestAdornmentModel", () => {
//   it("should create an instance", () => {
//     const model = RegionOfInterestAdornmentModel.create()
//     expect(model).toBeTruthy()
//   })

//   it("should set height", () => {
//     const heightProp = RoiUnitValueModel.create({ unit: "coordinate", value: 0 })
//     const model = RegionOfInterestAdornmentModel.create()
//     model.setHeight(heightProp)
//     expect(model.height).toBe(heightProp)
//   })

//   it("should set width", () => {
//     const widthProp = RoiUnitValueModel.create({ unit: "coordinate", value: 0})
//     const model = RegionOfInterestAdornmentModel.create()
//     model.setWidth(widthProp)
//     expect(model.width).toBe(widthProp)
//   })

//   it("should set position", () => {
//     const xPosition = RoiUnitValueModel.create({ unit: "coordinate", value: 100 })
//     const yPosition = RoiUnitValueModel.create({ unit: "coordinate", value: 150 })
//     const model = RegionOfInterestAdornmentModel.create()
//     model.setPosition(xPosition, yPosition)
//     expect(model.xPosition).toBe(xPosition)
//     expect(model.yPosition).toBe(yPosition)
//   })

//   it("should set size", () => {
//     const heightProp = RoiUnitValueModel.create({ unit: "coordinate", value: 0 })
//     const widthProp = RoiUnitValueModel.create({ unit: "coordinate", value: 0})
//     const model = RegionOfInterestAdornmentModel.create()
//     model.setSize(widthProp, heightProp)
//     expect(model.width).toBe(widthProp)
//     expect(model.height).toBe(heightProp)
//   })
// })
