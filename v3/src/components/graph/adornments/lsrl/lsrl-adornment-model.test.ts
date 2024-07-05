import { LSRLAdornmentModel, LSRLInstance } from "./lsrl-adornment-model"

const mockLSRLInstanceProps1 = {
  equationCoords: {x: 1, y: 1},
  intercept: 1,
  interceptLocked: false,
  rSquared: 1,
  sdResiduals: 1,
  slope: 1
}
const mockLSRLInstanceProps2 = {
  equationCoords: {x: 1, y: 1},
  intercept: 2,
  interceptLocked: false,
  rSquared: 2,
  sdResiduals: 2,
  slope: 2
}

describe("LSRLInstance", () => {
  it("is created with undefined equationCoords, intercept, rSquared, sdResiduals, and slope properties", () => {
    const lsrlInstance = LSRLInstance.create()
    expect(lsrlInstance.equationCoords).toBeUndefined()
    expect(lsrlInstance.intercept).toBeUndefined()
    expect(lsrlInstance.rSquared).toBeUndefined()
    expect(lsrlInstance.sdResiduals).toBeUndefined()
    expect(lsrlInstance.slope).toBeUndefined()
  })
  it("can have equationCoords properties set", () => {
    const lsrlInstance = LSRLInstance.create()
    expect(lsrlInstance.equationCoords).toBeUndefined()
    lsrlInstance.setEquationCoords({x: 50, y: 50})
    expect(lsrlInstance.equationCoords?.x).toEqual(50)
    expect(lsrlInstance.equationCoords?.y).toEqual(50)
  })
  it("can have intercept properties set", () => {
    const lsrlInstance = LSRLInstance.create()
    expect(lsrlInstance.intercept).toBeUndefined()
    lsrlInstance.setIntercept(1)
    expect(lsrlInstance.intercept).toEqual(1)
  })
  it("can have rSquared properties set", () => {
    const lsrlInstance = LSRLInstance.create()
    expect(lsrlInstance.rSquared).toBeUndefined()
    lsrlInstance.setRSquared(1)
    expect(lsrlInstance.rSquared).toEqual(1)
  })
  it("can have slope properties set", () => {
    const lsrlInstance = LSRLInstance.create(mockLSRLInstanceProps1)
    expect(lsrlInstance.slope).toBeUndefined()
    lsrlInstance.setSlope(1)
    expect(lsrlInstance.slope).toEqual(1)
  })
  it("can have sdResiduals properties set", () => {
    const lsrlInstance = LSRLInstance.create(mockLSRLInstanceProps1)
    expect(lsrlInstance.sdResiduals).toBeUndefined()
    lsrlInstance.setSdResiduals(1)
    expect(lsrlInstance.sdResiduals).toEqual(1)
  })
})

describe("LSRLAdornmentModel", () => {
  it("is created with its type property set to 'LSRL' and with its lines property an empty map", () => {
    const lSRL = LSRLAdornmentModel.create()
    expect(lSRL.type).toEqual("LSRL")
    expect(lSRL.lines.size).toEqual(0)
  })
  it("can have a line added to its lines property", () => {
    const lSRL = LSRLAdornmentModel.create()
    lSRL.updateLines(mockLSRLInstanceProps1,"", 0)
    expect(lSRL.lines.size).toEqual(1)
    const modelLines = lSRL.lines.get("")
    const modelLine = modelLines?.[0]
    expect(modelLine?.intercept).toEqual(mockLSRLInstanceProps1.intercept)
    expect(modelLine?.rSquared).toEqual(mockLSRLInstanceProps1.rSquared)
    expect(modelLine?.sdResiduals).toEqual(mockLSRLInstanceProps1.sdResiduals)
    expect(modelLine?.slope).toEqual(mockLSRLInstanceProps1.slope)
  })
  it("can have multiple lines with different cellkeys added to its lines property", () => {
    const line1 = mockLSRLInstanceProps1
    const line2 = mockLSRLInstanceProps2
    const lSRL = LSRLAdornmentModel.create()
    lSRL.updateLines(line1, "cellkey1", 0)
    lSRL.updateLines(line2, "cellkey2", 0)
    expect(lSRL.lines.size).toEqual(2)
    const modelLines1 = lSRL.lines.get("cellkey1")
    const modelLines2 = lSRL.lines.get("cellkey2")
    const modelLine1 = modelLines1?.[0]
    const modelLine2 = modelLines2?.[0]
    expect(modelLine1?.intercept).toEqual(line1.intercept)
    expect(modelLine1?.rSquared).toEqual(line1.rSquared)
    expect(modelLine1?.sdResiduals).toEqual(line1.sdResiduals)
    expect(modelLine1?.slope).toEqual(line1.slope)
    expect(modelLine2?.intercept).toEqual(line2.intercept)
    expect(modelLine2?.rSquared).toEqual(line2.rSquared)
    expect(modelLine2?.sdResiduals).toEqual(line2.sdResiduals)
    expect(modelLine2?.slope).toEqual(line2.slope)
  })
  it("can have multiple lines with the same cellkey added to its lines property", () => {
    const line1 = mockLSRLInstanceProps1
    const line2 = mockLSRLInstanceProps2
    const lSRL = LSRLAdornmentModel.create()
    lSRL.updateLines(line1, "sameKey", 0)
    lSRL.updateLines(line2, "sameKey", 1)
    expect(lSRL.lines.size).toEqual(1)
    const modelLines = lSRL.lines.get("sameKey")
    const modelLine1 = modelLines?.[0]
    const modelLine2 = modelLines?.[1]
    expect(modelLine1?.intercept).toEqual(line1.intercept)
    expect(modelLine1?.rSquared).toEqual(line1.rSquared)
    expect(modelLine1?.sdResiduals).toEqual(line1.sdResiduals)
    expect(modelLine1?.slope).toEqual(line1.slope)
    expect(modelLine2?.intercept).toEqual(line2.intercept)
    expect(modelLine2?.rSquared).toEqual(line2.rSquared)
    expect(modelLine2?.sdResiduals).toEqual(line2.sdResiduals)
    expect(modelLine2?.slope).toEqual(line2.slope)
  })
  it("can have its showConfidenceBands property set", () => {
    const lSRL = LSRLAdornmentModel.create()
    expect(lSRL.showConfidenceBands).toEqual(false)
    lSRL.setShowConfidenceBands(true)
    expect(lSRL.showConfidenceBands).toEqual(true)
  })
  it("can get both the intercept and slope values of a line via the line's slopeAndIntercept view", () => {
    const lSRL = LSRLAdornmentModel.create()
    lSRL.updateLines(mockLSRLInstanceProps1, "", 0)
    expect(lSRL.lines.get("")?.[0]?.slopeAndIntercept).toEqual({intercept: 1, slope: 1})
  })
})
