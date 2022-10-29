import { GraphAttrRole } from "../components/graph/models/data-configuration-model"
import { AttributeType } from "../models/data/attribute"
import {determineBaseString} from "./use-drop-hint-string"

interface Scenario {
  role: GraphAttrRole
  dropType: AttributeType
  existingType?: AttributeType
}
const numericToEmptyAxis: Scenario = { role: "x", dropType: "numeric", existingType: undefined }
const numericToPopulatedAxis: Scenario = { role: "x", dropType: "numeric", existingType: "numeric" }
const categoricalToPlot: Scenario = { role: "legend", dropType: "categorical", existingType: "categorical" }

describe("determineBaseString should return correct string key for potential plot drops", () => {
  it("returns key for numeric attr to empty axis", () => {
    const { role, dropType, existingType } = numericToEmptyAxis
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
