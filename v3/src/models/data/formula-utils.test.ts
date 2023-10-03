import { DisplayNameMap } from "./formula-types"
import {
  safeSymbolName, customizeFormula, reverseDisplayNameMap, canonicalToDisplay, makeNamesSafe
} from "./formula-utils"

const displayNameMapExample: DisplayNameMap = {
  "localNames": {
    "LifeSpan": "LOCAL_ATTR_ATTR_LIFE_SPAN",
    "Order": "LOCAL_ATTR_ATTR_ORDER",
    "caseIndex": "LOCAL_ATTR_CASE_INDEX",
    "v1": "GLOBAL_VALUE_GLOB_V1"
  },
  "dataSet": {
    "Mammals": {
      "id": "DATA_MAMMALS",
      "attribute": {
        "LifeSpan": "ATTR_LIFE_SPAN",
        "Order": "ATTR_ORDER",
      }
    },
    "Roller Coaster": {
      "id": "DATA_ROLLER_COASTER",
      "attribute": {
        "Park": "ATTR_PARK",
        "Top Speed": "ATTR_TOP_SPEED",
      }
    }
  }
}

describe("safeSymbolName", () => {
  it("converts strings that are not parsable by Mathjs to valid symbol names", () => {
    expect(safeSymbolName("Valid_Name_Should_Not_Be_Changed")).toEqual("Valid_Name_Should_Not_Be_Changed")
    expect(safeSymbolName("Attribute Name")).toEqual("Attribute_Name")
    expect(safeSymbolName("1")).toEqual("_1")
    expect(safeSymbolName("1a")).toEqual("_1a")
    expect(safeSymbolName("Attribute 🙃 Test")).toEqual("Attribute____Test")
  })
})

describe("makeNamesSafe", () => {
  it("replaces all the symbols enclosed between `` with safe symbol names", () => {
    expect(makeNamesSafe("mean(`Attribute Name`)")).toEqual("mean(Attribute_Name)")
    expect(makeNamesSafe("`Attribute Name` + `Attribute Name 2`")).toEqual("Attribute_Name + Attribute_Name_2")
  })
})

describe("customizeFormula", () => {
  it("replaces all the assignment operators with equality operators", () => {
    expect(customizeFormula("a = 1")).toEqual("a == 1")
    expect(customizeFormula("a = b")).toEqual("a == b")
    expect(customizeFormula("a = b = c")).toEqual("a == b == c")
  })
  it("doesn't replace unequality operator", () => {
    expect(customizeFormula("a != 1")).toEqual("a != 1")
    expect(customizeFormula("a != b")).toEqual("a != b")
    expect(customizeFormula("a != b = c = d != e")).toEqual("a != b == c == d != e")
  })
})

describe("reverseDisplayNameMap", () => {
  it("reverses the display name map", () => {
    expect(reverseDisplayNameMap(displayNameMapExample)).toEqual({
      LOCAL_ATTR_ATTR_LIFE_SPAN: "LifeSpan",
      LOCAL_ATTR_ATTR_ORDER: "Order",
      LOCAL_ATTR_CASE_INDEX: "caseIndex",
      GLOBAL_VALUE_GLOB_V1: "v1",
      DATA_MAMMALS: "Mammals",
      ATTR_LIFE_SPAN: "LifeSpan",
      ATTR_ORDER: "Order",
      DATA_ROLLER_COASTER: "Roller Coaster",
      ATTR_PARK: "Park",
      ATTR_TOP_SPEED: "Top Speed",
    })
  })
})

describe("canonicalToDisplay", () => {
  it("converts canonical formula to display formula maintaining whitespace characters", () => {
    expect(canonicalToDisplay(
      "mean(LOCAL_ATTR_ATTR_LIFE_SPAN) + GLOBAL_VALUE_GLOB_V1",
      "mean (\nLifeSpan\n) + v1 ", displayNameMapExample
    )).toEqual("mean (\nLifeSpan\n) + v1 ")
    expect(canonicalToDisplay(
      "mean(LOCAL_ATTR_ATTR_LIFE_SPAN) + LOCAL_ATTR_ATTR_ORDER * GLOBAL_VALUE_GLOB_V1",
      "mean (\nOldLifeSpan\n) + OldOrder * OldV1", displayNameMapExample
    )).toEqual("mean (\nLifeSpan\n) + Order * v1")
  })
  describe("when function name or constant is equal to attribute name", () => {
    const displayMap: DisplayNameMap = {
      localNames: {
        NewMeanAttr: "LOCAL_ATTR_ATTR_MEAN",
      },
      dataSet: {}
    }
    it("still converts canonical formula to display formula correctly", () => {
      expect(canonicalToDisplay(
        "mean(LOCAL_ATTR_ATTR_MEAN) + 'mean'",
        "mean ( mean ) + 'mean'", displayMap
      )).toEqual("mean ( NewMeanAttr ) + 'mean'")
    })
  })
  describe("when attribute name includes special characters", () => {
    const testDisplayMap: DisplayNameMap = {
      localNames: {
        "new mean attribute 🙃": "LOCAL_ATTR_ATTR_MEAN",
      },
      dataSet: {}
    }
    it("is enclosed in backticks", () => {
      expect(canonicalToDisplay(
        "mean(LOCAL_ATTR_ATTR_MEAN) + 'mean'",
        "mean ( mean ) + 'mean'", testDisplayMap
      )).toEqual("mean ( `new mean attribute 🙃` ) + 'mean'")
    })
  })
  describe("when attribute name is provided as string constant (e.g. lookup functions)", () => {
    it("is still converted correctly and names with special characters are NOT enclosed in backticks", () => {
      expect(canonicalToDisplay(
        "lookupByKey('DATA_ROLLER_COASTER', 'ATTR_PARK', 'ATTR_TOP_SPEED', LOCAL_ATTR_ATTR_ORDER) * 2",
        "lookupByKey('Old Roller Coaster', 'Old Park', 'Old Top Speed', OldOrder) * 2",
        displayNameMapExample
      )).toEqual("lookupByKey('Roller Coaster', 'Park', 'Top Speed', Order) * 2")
    })
  })
})
