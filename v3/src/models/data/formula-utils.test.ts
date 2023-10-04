import { DisplayNameMap } from "./formula-types"
import {
  safeSymbolName, customizeDisplayFormula, reverseDisplayNameMap, canonicalToDisplay, makeDisplayNamesSafe,
  displayToCanonical, unescapeCharactersInSafeSymbolName, escapeCharactersInSafeSymbolName
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

describe("displayToCanonical", () => {
  it("converts display formula to canonical formula", () => {
    expect(displayToCanonical(
      "mean(LifeSpan) * v1", displayNameMapExample
    )).toEqual("mean(LOCAL_ATTR_ATTR_LIFE_SPAN) * GLOBAL_VALUE_GLOB_V1")
  })
  describe("when function name or constant is equal to attribute name", () => {
    const displayMap: DisplayNameMap = {
      localNames: {
        mean: "LOCAL_ATTR_ATTR_MEAN",
      },
      dataSet: {}
    }
    it("still converts display formula to canonical formula correctly", () => {
      expect(displayToCanonical(
        "mean(mean) + 'mean'", displayMap
      )).toEqual('mean(LOCAL_ATTR_ATTR_MEAN) + "mean"')
    })
  })
  describe("when attribute name includes special characters", () => {
    const testDisplayMap: DisplayNameMap = {
      localNames: {
        [safeSymbolName("mean attribute 🙃")]: "LOCAL_ATTR_ATTR_MEAN",
      },
      dataSet: {}
    }
    it("works as long as it's enclosed in backticks", () => {
      expect(displayToCanonical(
        "mean(`mean attribute 🙃`) + 'mean'", testDisplayMap
      )).toEqual('mean(LOCAL_ATTR_ATTR_MEAN) + "mean"')
    })
  })
  describe("when attribute name is provided as string constant (e.g. lookup functions)", () => {
    it("is still converted correctly and names with special characters are NOT enclosed in backticks", () => {
      expect(displayToCanonical(
        "lookupByKey('Roller Coaster', 'Park', 'Top Speed', Order) * 2", displayNameMapExample
      )).toEqual('lookupByKey("DATA_ROLLER_COASTER", "ATTR_PARK", "ATTR_TOP_SPEED", LOCAL_ATTR_ATTR_ORDER) * 2')
    })
  })
})

describe("unescapeCharactersInSafeSymbolName", () => {
  it("converts escaped characters in safe symbol name to original characters", () => {
    expect(unescapeCharactersInSafeSymbolName("Attribute\\`Test")).toEqual("Attribute`Test")
    expect(unescapeCharactersInSafeSymbolName("Attribute\\\\Test")).toEqual("Attribute\\Test")
  })
  it("is's an inverse of escapeCharactersInSafeSymbolName", () => {
    const testString = "Attribute\\\\\\`Test"
    expect(unescapeCharactersInSafeSymbolName(escapeCharactersInSafeSymbolName(testString))).toEqual(testString)
  })
})

describe("escapeCharactersInSafeSymbolName", () => {
  it("converts some characters in safe symbol name to escaped characters", () => {
    expect(escapeCharactersInSafeSymbolName("Attribute`Test")).toEqual("Attribute\\`Test")
    expect(escapeCharactersInSafeSymbolName("Attribute\\Test")).toEqual("Attribute\\\\Test")
  })
  it("is's an inverse of unescapeCharactersInSafeSymbolName", () => {
    const testString = "Attribute`Test\\"
    expect(unescapeCharactersInSafeSymbolName(escapeCharactersInSafeSymbolName(testString))).toEqual(testString)
  })
})

describe("safeSymbolName", () => {
  it("converts strings that are not parsable by Mathjs to valid symbol names", () => {
    expect(safeSymbolName("Valid_Name_Should_Not_Be_Changed")).toEqual("Valid_Name_Should_Not_Be_Changed")
    expect(safeSymbolName("Attribute Name")).toEqual("Attribute_Name")
    expect(safeSymbolName("1")).toEqual("_1")
    expect(safeSymbolName("1a")).toEqual("_1a")
    expect(safeSymbolName("Attribute 🙃 Test")).toEqual("Attribute____Test")
    expect(safeSymbolName("Attribute`Test")).toEqual("Attribute_Test")
    expect(safeSymbolName("Attribute\\Test")).toEqual("Attribute_Test")
    expect(safeSymbolName("Attribute\\\\Test")).toEqual("Attribute__Test")
    expect(safeSymbolName("Attribute\\`Test")).toEqual("Attribute__Test")
    expect(safeSymbolName("Attribute\\\\\\`Test")).toEqual("Attribute____Test")
  })
  it("supports `unescape` option", () => {
    expect(safeSymbolName("Attribute\\Test", true)).toEqual("Attribute_Test")
    expect(safeSymbolName("Attribute\\\\Test", true)).toEqual("Attribute_Test") // \\ treated as one character
    expect(safeSymbolName("Attribute\\`Test", true)).toEqual("Attribute_Test") // \` treated as one character
    expect(safeSymbolName("Attribute\\\\\\`Test", true)).toEqual("Attribute__Test")
  })
})

describe("makeDisplayNamesSafe", () => {
  it("replaces all the symbols enclosed between `` with safe symbol names", () => {
    expect(makeDisplayNamesSafe("mean(`Attribute Name`)")).toEqual("mean(Attribute_Name)")
    expect(makeDisplayNamesSafe("`Attribute Name` + `Attribute\\`Name 2`")).toEqual("Attribute_Name + Attribute_Name_2")
  })
})

describe("customizeDisplayFormula", () => {
  it("replaces all the assignment operators with equality operators", () => {
    expect(customizeDisplayFormula("a = 1")).toEqual("a == 1")
    expect(customizeDisplayFormula("a = b")).toEqual("a == b")
    expect(customizeDisplayFormula("a = b = c")).toEqual("a == b == c")
  })
  it("doesn't replace unequality operator", () => {
    expect(customizeDisplayFormula("a != 1")).toEqual("a != 1")
    expect(customizeDisplayFormula("a != b")).toEqual("a != b")
    expect(customizeDisplayFormula("a != b = c = d != e")).toEqual("a != b == c == d != e")
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
      "mean (\nLifeSpan\n) + v1 ", reverseDisplayNameMap(displayNameMapExample)
    )).toEqual("mean (\nLifeSpan\n) + v1 ")
    expect(canonicalToDisplay(
      "mean(LOCAL_ATTR_ATTR_LIFE_SPAN) + LOCAL_ATTR_ATTR_ORDER * GLOBAL_VALUE_GLOB_V1",
      "mean (\nOldLifeSpan\n) + OldOrder * OldV1", reverseDisplayNameMap(displayNameMapExample)
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
        "mean ( mean ) + 'mean'", reverseDisplayNameMap(displayMap)
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
        "mean ( mean ) + 'mean'", reverseDisplayNameMap(testDisplayMap)
      )).toEqual("mean ( `new mean attribute 🙃` ) + 'mean'")
    })
  })
  describe("when attribute name is provided as string constant (e.g. lookup functions)", () => {
    it("is still converted correctly and names with special characters are NOT enclosed in backticks", () => {
      expect(canonicalToDisplay(
        "lookupByKey('DATA_ROLLER_COASTER', 'ATTR_PARK', 'ATTR_TOP_SPEED', LOCAL_ATTR_ATTR_ORDER) * 2",
        "lookupByKey('Old Roller Coaster', 'Old Park', 'Old Top Speed', OldOrder) * 2",
        reverseDisplayNameMap(displayNameMapExample)
      )).toEqual("lookupByKey('Roller Coaster', 'Park', 'Top Speed', Order) * 2")
    })
  })
})
