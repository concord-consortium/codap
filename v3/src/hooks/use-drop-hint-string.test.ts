import {GraphAttrRole} from "../components/data-display/data-display-types"
import {AttributeType} from "../models/data/attribute-types"
import {determineBaseString} from "./use-drop-hint-string"

interface Scenario {
  role: GraphAttrRole
  dropType: AttributeType
  existingType?: AttributeType
}
const numericToEmptyXAxis: Scenario = { role: "x", dropType: "numeric", existingType: undefined }
const numericToEmptyYAxis: Scenario = { role: "y", dropType: "numeric", existingType: undefined }
const numericToPopulatedAxis: Scenario = { role: "x", dropType: "numeric", existingType: "numeric" }
const categoricalToPlot: Scenario = { role: "legend", dropType: "categorical", existingType: "categorical" }

describe("determineBaseString should return correct string key for potential plot drops", () => {
  it("returns key for numeric attr to empty x axis", () => {
    const { role, dropType, existingType } = numericToEmptyXAxis
    const result = determineBaseString(role, dropType, existingType)
    expect(result).toEqual("DG.GraphView.addToEmptyX")
  })
  it("returns key for numeric attr to empty y axis", () => {
    const { role, dropType, existingType } = numericToEmptyYAxis
    const result = determineBaseString(role, dropType, existingType)
    expect(result).toEqual("DG.GraphView.addToEmptyPlace")
  })
  it("returns key for numeric attr to populated axis", () => {
    const { role, dropType, existingType } = numericToPopulatedAxis
    const result = determineBaseString(role, dropType, existingType)
    expect(result).toEqual("DG.GraphView.replaceAttribute")
  })
  it("returns key for attr to legend", () => {
    const { role, dropType, existingType } = categoricalToPlot
    const result = determineBaseString(role, dropType, existingType)
    expect(result).toEqual("DG.GraphView.dropInPlot")
  })
})
