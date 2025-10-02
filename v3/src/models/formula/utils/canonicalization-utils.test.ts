import { DisplayNameMap } from "../formula-types"
import {
  formulaIndexOf, displayToCanonical, safeSymbolNameFromDisplayFormula,
  makeDisplayNamesSafe, customizeDisplayFormula, canonicalToDisplay
} from "./canonicalization-utils"
import { reverseDisplayNameMap, safeSymbolName } from "./name-mapping-utils"

const displayNameMapExample: DisplayNameMap = {
  "localNames": {
    "LifeSpan": "__CANONICAL_NAME__LOCAL_ATTR_ATTR_LIFE_SPAN",
    "Order": "__CANONICAL_NAME__LOCAL_ATTR_ATTR_ORDER",
    "caseIndex": "__CANONICAL_NAME__LOCAL_ATTR_CASE_INDEX",
    "v1": "__CANONICAL_NAME__GLOBAL_VALUE_GLOB_V1"
  },
  "dataSet": {
    "Mammals": {
      "id": "__CANONICAL_NAME__DATA_MAMMALS",
      "attribute": {
        "LifeSpan": "__CANONICAL_NAME__ATTR_LIFE_SPAN",
        "Order": "__CANONICAL_NAME__ATTR_ORDER",
      }
    },
    "Roller Coaster": {
      "id": "__CANONICAL_NAME__DATA_ROLLER_COASTER",
      "attribute": {
        // \, ', and " are added to test characters escaping
        "Park\"": "__CANONICAL_NAME__ATTR_PARK",
        "Top\\Speed'": "__CANONICAL_NAME__ATTR_TOP_SPEED",
      }
    }
  }
}

describe("safeSymbolNameFromDisplayFormula", () => {
  it("unescapes special characters and converts strings that are not parsable by Mathjs to valid symbol names", () => {
    // \\ and \` treated as one character
    expect(safeSymbolNameFromDisplayFormula("Attribute\\Test")).toEqual("Attribute_Test")
    expect(safeSymbolNameFromDisplayFormula("Attribute\\\\Test")).toEqual("Attribute_Test")
    expect(safeSymbolNameFromDisplayFormula("Attribute\\`Test")).toEqual("Attribute_Test")
    expect(safeSymbolNameFromDisplayFormula("Attribute\\\\\\`Test")).toEqual("Attribute__Test")
  })
})

describe("makeDisplayNamesSafe", () => {
  it("replaces all the symbols enclosed between `` with safe symbol names", () => {
    expect(makeDisplayNamesSafe("mean(`Attribute Name`)")).toEqual("mean(Attribute_Name)")
    // \` and \\ treated as one symbol - unescaping is done in safeSymbolNameFromDisplayFormula
    expect(makeDisplayNamesSafe("`Attr\\\\Name` + `Attr\\`Name 2`")).toEqual("Attr_Name + Attr_Name_2")
  })
})

describe("customizeDisplayFormula", () => {
  it("replaces all the assignment operators with equality operators", () => {
    expect(customizeDisplayFormula("a = 1")).toEqual("a == 1")
    expect(customizeDisplayFormula("a = b")).toEqual("a == b")
    expect(customizeDisplayFormula("a = b = c")).toEqual("a == b == c")
  })
  it("doesn't replace double equality operator", () => {
    expect(customizeDisplayFormula("a == 1")).toEqual("a == 1")
    expect(customizeDisplayFormula("a == b")).toEqual("a == b")
    expect(customizeDisplayFormula("a == b = c = d == e")).toEqual("a == b == c == d == e")
  })
  it("doesn't replace inequality operators", () => {
    expect(customizeDisplayFormula("a != 1")).toEqual("a != 1")
    expect(customizeDisplayFormula("a != b")).toEqual("a != b")
    expect(customizeDisplayFormula("a != b = c = d != e")).toEqual("a != b == c == d != e")

    expect(customizeDisplayFormula("a <= 1")).toEqual("a <= 1")
    expect(customizeDisplayFormula("a <= b")).toEqual("a <= b")
    expect(customizeDisplayFormula("a <= b = c = d <= e")).toEqual("a <= b == c == d <= e")

    expect(customizeDisplayFormula("a >= 1")).toEqual("a >= 1")
    expect(customizeDisplayFormula("a >= b")).toEqual("a >= b")
    expect(customizeDisplayFormula("a >= b = c = d >= e")).toEqual("a >= b == c == d >= e")
  })
  it("replaces unicode characters with MathJS supported characters", () => {
    expect(customizeDisplayFormula("a ≠ 1")).toEqual("a != 1")
    expect(customizeDisplayFormula("a ≠ b")).toEqual("a != b")
    expect(customizeDisplayFormula("a ≠ b = c = d ≠ e")).toEqual("a != b == c == d != e")

    expect(customizeDisplayFormula("a ≥ 1")).toEqual("a >= 1")
    expect(customizeDisplayFormula("a ≥ b")).toEqual("a >= b")
    expect(customizeDisplayFormula("a ≥ b = c = d ≥ e")).toEqual("a >= b == c == d >= e")

    expect(customizeDisplayFormula("a ≤ 1")).toEqual("a <= 1")
    expect(customizeDisplayFormula("a ≤ b")).toEqual("a <= b")
    expect(customizeDisplayFormula("a ≤ b = c = d ≤ e")).toEqual("a <= b == c == d <= e")

    expect(customizeDisplayFormula("a × 1")).toEqual("a * 1")
    expect(customizeDisplayFormula("a × b")).toEqual("a * b")
    expect(customizeDisplayFormula("a × b = c = d × e")).toEqual("a * b == c == d * e")

    expect(customizeDisplayFormula("a ÷ 1")).toEqual("a / 1")
    expect(customizeDisplayFormula("a ÷ b")).toEqual("a / b")
    expect(customizeDisplayFormula("a ÷ b = c = d ÷ e")).toEqual("a / b == c == d / e")

    expect(customizeDisplayFormula("π")).toEqual("pi")
    expect(customizeDisplayFormula("∞")).toEqual("Infinity")
  })
  it("replaces % with mod", () => {
    expect(customizeDisplayFormula("a % 1")).toEqual("a  mod  1")
    expect(customizeDisplayFormula("a%1")).toEqual("a mod 1")
    expect(customizeDisplayFormula("a % -1")).toEqual("a  mod  -1")
    expect(customizeDisplayFormula("a%-1")).toEqual("a mod -1")
  })
  it("replaces comments with spaces", () => {
    expect(customizeDisplayFormula("a + /* comment */ b")).toEqual("a +   b")
    expect(customizeDisplayFormula("a + b // comment")).toEqual("a + b  ")
  })
  it("replaces ternary operator with if() function", () => {
    expect(customizeDisplayFormula("a ? b : c")).toEqual("if(a, b, c)")
  })
})

describe("formulaIndexOf", () => {
  const formula = "foo.bar + 'baz' + \"qux\" + 'qux' + \"baz\""

  describe("when name is a symbol, not a string constant", () => {
    const isStringConstant = false
    it("returns the index of the name in the formula", () => {
      const result = formulaIndexOf(formula, "bar", isStringConstant)
      expect(result).toEqual({ stringDelimiter: null, nameIndex: 4, finalName: "bar" })
    })
  })

  describe("when name is a string constant", () => {
    const isStringConstant = true
    it("returns the index of the first found name in the formula if it is a double-quoted string constant", () => {
      const name = "qux"
      const result = formulaIndexOf(formula, name, isStringConstant)
      expect(result).toEqual({ stringDelimiter: "\"", nameIndex: 18, finalName: "\"qux\"" })
    })

    it("returns the index of the name in the formula if it is a single-quoted string constant", () => {
      const name = "baz"
      const result = formulaIndexOf(formula, name, isStringConstant)
      expect(result).toEqual({ stringDelimiter: "'", nameIndex: 10, finalName: "'baz'" })
    })

    it("returns -1 if the name is not found in the formula", () => {
      const name = "quux"
      const result = formulaIndexOf(formula, name, isStringConstant)
      expect(result).toEqual({ stringDelimiter: null, nameIndex: -1, finalName: "quux" })
    })
  })
})

describe("displayToCanonical", () => {
  it("converts display formula to canonical formula", () => {
    expect(displayToCanonical(
      "mean(LifeSpan) * v1", displayNameMapExample
    )).toEqual("mean(__CANONICAL_NAME__LOCAL_ATTR_ATTR_LIFE_SPAN) * __CANONICAL_NAME__GLOBAL_VALUE_GLOB_V1")
  })
  describe("when function name or constant is equal to attribute name", () => {
    const displayMap: DisplayNameMap = {
      localNames: {
        mean: "__CANONICAL_NAME__LOCAL_ATTR_ATTR_MEAN",
      },
      dataSet: {}
    }
    it("still converts display formula to canonical formula correctly", () => {
      expect(displayToCanonical(
        "mean(mean) + 'mean'", displayMap
      )).toEqual('mean(__CANONICAL_NAME__LOCAL_ATTR_ATTR_MEAN) + "mean"')
    })
  })
  describe("when attribute name includes special characters", () => {
    const testDisplayMap: DisplayNameMap = {
      localNames: {
        [safeSymbolName("mean`attribute\\🙃")]: "__CANONICAL_NAME__LOCAL_ATTR_ATTR_MEAN",
      },
      dataSet: {}
    }
    it("works as long as it's enclosed in backticks", () => {
      expect(displayToCanonical(
        "mean(`mean\\`attribute\\\\🙃`) + 'mean'", testDisplayMap
      )).toEqual('mean(__CANONICAL_NAME__LOCAL_ATTR_ATTR_MEAN) + "mean"')
    })
  })
  describe("when string constant includes special characters", () => {
    it("is converted and escaped correctly", () => {
      expect(displayToCanonical(
        `if(1 < 2, 'ok\\'ay', "not\\"okay")`, displayNameMapExample
      )).toEqual(`if(1 < 2, "ok'ay", "not\\"okay")`)
      // MathJS always uses double quotes for string constants.
      // This is fine, as the reverse function, canonicalToDisplay, will convert them back to single quotes.
    })
  })
  describe("when attribute name is provided as string constant (e.g. lookup functions)", () => {
    it("is still converted correctly", () => {
      expect(displayToCanonical(
        'lookupByKey("Roller Coaster", "Park\\"", "Top\\\\Speed\'", Order) * 2', displayNameMapExample
      )).toEqual(
        'lookupByKey("__CANONICAL_NAME__DATA_ROLLER_COASTER", "__CANONICAL_NAME__ATTR_PARK", ' +
        '"__CANONICAL_NAME__ATTR_TOP_SPEED", __CANONICAL_NAME__LOCAL_ATTR_ATTR_ORDER) * 2'
      )
    })
  })
})

describe("reverseDisplayNameMap", () => {
  it("reverses the display name map", () => {
    expect(reverseDisplayNameMap(displayNameMapExample)).toEqual({
      __CANONICAL_NAME__LOCAL_ATTR_ATTR_LIFE_SPAN: "LifeSpan",
      __CANONICAL_NAME__LOCAL_ATTR_ATTR_ORDER: "Order",
      __CANONICAL_NAME__LOCAL_ATTR_CASE_INDEX: "caseIndex",
      __CANONICAL_NAME__GLOBAL_VALUE_GLOB_V1: "v1",
      __CANONICAL_NAME__DATA_MAMMALS: "Mammals",
      __CANONICAL_NAME__ATTR_LIFE_SPAN: "LifeSpan",
      __CANONICAL_NAME__ATTR_ORDER: "Order",
      __CANONICAL_NAME__DATA_ROLLER_COASTER: "Roller Coaster",
      __CANONICAL_NAME__ATTR_PARK: "Park\"",
      __CANONICAL_NAME__ATTR_TOP_SPEED: "Top\\Speed'",
    })
  })
})

describe("canonicalToDisplay", () => {
  it("converts canonical formula to display formula maintaining whitespace characters", () => {
    expect(canonicalToDisplay(
      "mean(__CANONICAL_NAME__LOCAL_ATTR_ATTR_LIFE_SPAN) +__CANONICAL_NAME__GLOBAL_VALUE_GLOB_V1",
      "mean (\nLifeSpan\n) + v1 ", reverseDisplayNameMap(displayNameMapExample)
    )).toEqual("mean (\nLifeSpan\n) + v1 ")
    expect(canonicalToDisplay(
      "mean(__CANONICAL_NAME__LOCAL_ATTR_ATTR_LIFE_SPAN) + __CANONICAL_NAME__LOCAL_ATTR_ATTR_ORDER" +
      " * __CANONICAL_NAME__GLOBAL_VALUE_GLOB_V1",
      "mean (\nOldLifeSpan\n) + OldOrder * OldV1", reverseDisplayNameMap(displayNameMapExample)
    )).toEqual("mean (\nLifeSpan\n) + Order * v1")
  })
  it("throws an error if canonical formula contains unresolved canonical names", () => {
    expect(() => canonicalToDisplay(
      "mean(__CANONICAL_NAME__LOCAL_ATTR_ATTR_REMOVED_ATTRIBUTE)",
      "mean(RemovedAttribute)", reverseDisplayNameMap(displayNameMapExample)
    )).toThrow("canonicalToDisplay: canonical name not found in canonicalNameMap")
  })

  describe("when function name or constant is equal to attribute name", () => {
    const displayMap: DisplayNameMap = {
      localNames: {
        NewMeanAttr: "__CANONICAL_NAME__LOCAL_ATTR_ATTR_MEAN",
      },
      dataSet: {}
    }
    it("still converts canonical formula to display formula correctly", () => {
      expect(canonicalToDisplay(
        "mean(__CANONICAL_NAME__LOCAL_ATTR_ATTR_MEAN) + 'mean'",
        "mean ( mean ) + 'mean'", reverseDisplayNameMap(displayMap)
      )).toEqual("mean ( NewMeanAttr ) + 'mean'")
    })
  })
  describe("when attribute name includes special characters", () => {
    const testDisplayMap: DisplayNameMap = {
      localNames: {
        "new\\mean`attribute 🙃": "__CANONICAL_NAME__LOCAL_ATTR_ATTR_MEAN",
      },
      dataSet: {}
    }
    it("is enclosed in backticks and special characters are escaped", () => {
      expect(canonicalToDisplay(
        "mean(__CANONICAL_NAME__LOCAL_ATTR_ATTR_MEAN) + 'mean'",
        "mean ( mean ) + 'mean'", reverseDisplayNameMap(testDisplayMap)
      )).toEqual("mean ( `new\\\\mean\\`attribute 🙃` ) + 'mean'")
    })
  })
  describe("when string constant includes special characters", () => {
    it("is maintained and escaped correctly", () => {
      expect(canonicalToDisplay(
        `if(1 < 50, "ok'ay", "not\\"okay")`,
        `if(1 < 2, 'ok\\'ay', "not\\"okay")`, reverseDisplayNameMap(displayNameMapExample)
      )).toEqual(`if(1 < 2, 'ok\\'ay', "not\\"okay")`)
    })
  })
  describe("when attribute name is provided as a double quote string constant (e.g. lookup functions)", () => {
    it("is still converted correctly and is NOT enclosed in backticks", () => {
      expect(canonicalToDisplay(
        'lookupByKey("__CANONICAL_NAME__DATA_ROLLER_COASTER", "__CANONICAL_NAME__ATTR_PARK",' +
        ' "__CANONICAL_NAME__ATTR_TOP_SPEED", __CANONICAL_NAME__LOCAL_ATTR_ATTR_ORDER) * 2',
        'lookupByKey("Old Roller Coaster", "Old\\"Park", "Old\\"Top\'Speed", OldOrder) * 2',
        reverseDisplayNameMap(displayNameMapExample)
      )).toEqual('lookupByKey("Roller Coaster", "Park\\"", "Top\\\\Speed\'", Order) * 2')
    })
  })
  describe("when attribute name is provided as a single quote string constant (e.g. lookup functions)", () => {
    it("is still converted correctly and is NOT enclosed in backticks", () => {
      expect(canonicalToDisplay(
        "lookupByKey('__CANONICAL_NAME__DATA_ROLLER_COASTER', '__CANONICAL_NAME__ATTR_PARK'," +
        " '__CANONICAL_NAME__ATTR_TOP_SPEED', __CANONICAL_NAME__LOCAL_ATTR_ATTR_ORDER) * 2",
        "lookupByKey('Old Roller Coaster', 'Old\"Park', 'Old\"Top\\'Speed', OldOrder) * 2",
        reverseDisplayNameMap(displayNameMapExample)
      )).toEqual("lookupByKey('Roller Coaster', 'Park\"', 'Top\\\\Speed\\'', Order) * 2")
    })
  })
})
