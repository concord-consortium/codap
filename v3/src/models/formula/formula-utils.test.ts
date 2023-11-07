import { DataSet } from "../data/data-set"
import { GlobalValueManager } from "../global/global-value-manager"
import {
  CANONICAL_NAME, CASE_INDEX_FAKE_ATTR_ID, DisplayNameMap, GLOBAL_VALUE, LOCAL_ATTR, isCanonicalName
} from "./formula-types"
import {
  safeSymbolName, customizeDisplayFormula, reverseDisplayNameMap, canonicalToDisplay, makeDisplayNamesSafe,
  displayToCanonical, unescapeBacktickString, escapeBacktickString, safeSymbolNameFromDisplayFormula,
  parseBasicCanonicalName, formulaIndexOf, getDisplayNameMap, getCanonicalNameMap, localAttrIdToCanonical,
  globalValueIdToCanonical, idToCanonical
} from "./formula-utils"
import { getFormulaTestEnv } from "./test-utils/formula-test-utils"

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

describe("parseBasicCanonicalName", () => {
  it("returns undefined if the name is not a canonical name", () => {
    const name = "FOO_BAR"
    const result = parseBasicCanonicalName(name)
    expect(result).toBeUndefined()
  })
  it("returns a local attribute dependency if the name starts with the local attribute prefix", () => {
    const name = `${CANONICAL_NAME}${LOCAL_ATTR}foo`
    const result = parseBasicCanonicalName(name)
    expect(result).toEqual({ type: "localAttribute", attrId: "foo" })
  })
  it("returns a global value dependency if the name starts with the global value prefix", () => {
    const name = `${CANONICAL_NAME}${GLOBAL_VALUE}bar`
    const result = parseBasicCanonicalName(name)
    expect(result).toEqual({ type: "globalValue", globalId: "bar" })
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

describe("unescapeBacktickString", () => {
  it("converts escaped characters in safe symbol name to original characters", () => {
    expect(unescapeBacktickString("Attribute\\`Test")).toEqual("Attribute`Test")
    expect(unescapeBacktickString("Attribute\\\\Test")).toEqual("Attribute\\Test")
  })
  it("is's an inverse of escapeBacktickString", () => {
    const testString = "Attribute\\\\\\`Test"
    expect(unescapeBacktickString(escapeBacktickString(testString))).toEqual(testString)
  })
})

describe("escapeBacktickString", () => {
  it("converts some characters in safe symbol name to escaped characters", () => {
    expect(escapeBacktickString("Attribute`Test")).toEqual("Attribute\\`Test")
    expect(escapeBacktickString("Attribute\\Test")).toEqual("Attribute\\\\Test")
  })
  it("is's an inverse of unescapeBacktickString", () => {
    const testString = "Attribute`Test\\"
    expect(unescapeBacktickString(escapeBacktickString(testString))).toEqual(testString)
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
})
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
  it("doesn't replace unequality operator", () => {
    expect(customizeDisplayFormula("a != 1")).toEqual("a != 1")
    expect(customizeDisplayFormula("a != b")).toEqual("a != b")
    expect(customizeDisplayFormula("a != b = c = d != e")).toEqual("a != b == c == d != e")
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

describe("getDisplayNameMap", () => {
  it("returns a display name map", () => {
    const formulaTestEnv = getFormulaTestEnv()
    const nameMap = getDisplayNameMap({
      localDataSet: formulaTestEnv.dataSetsByName.Mammals,
      dataSets: formulaTestEnv.dataSets,
      globalValueManager: formulaTestEnv.globalValueManager,
    })
    // Note that all the ids should be possible to find in test-utils/test-doc.json
    expect(nameMap).toEqual({
      localNames: {
        Diet: "__CANONICAL_NAME__LOCAL_ATTR_ATTR1ReY3dlsdbuv",
        Habitat: "__CANONICAL_NAME__LOCAL_ATTR_ATTRx8a3s6Wlt56J",
        Height: "__CANONICAL_NAME__LOCAL_ATTR_ATTRbTY852h1USQZ",
        LifeSpan: "__CANONICAL_NAME__LOCAL_ATTR_ATTRomXh7fH2nyrH",
        Mammal: "__CANONICAL_NAME__LOCAL_ATTR_ATTRBWlW1AbMTAlH",
        Mass: "__CANONICAL_NAME__LOCAL_ATTR_ATTRUiaBOgPAOiu0",
        Order: "__CANONICAL_NAME__LOCAL_ATTR_ATTRSn_zW_Cmyl1G",
        Sleep: "__CANONICAL_NAME__LOCAL_ATTR_ATTRlgjzH8Zouak4",
        Speed: "__CANONICAL_NAME__LOCAL_ATTR_ATTRUmG4vmDYa9CC",
        caseIndex: "__CANONICAL_NAME__LOCAL_ATTR_CASE_INDEX",
        v1: "__CANONICAL_NAME__GLOBAL_VALUE_GLOBqRLnshLJT6RL",
        v2: "__CANONICAL_NAME__GLOBAL_VALUE_GLOBsy0ZXg9dUZvt",
      },
      dataSet: {
        Mammals: {
          id: "__CANONICAL_NAME__DATAJXM3nKZTmvL8",
          attribute: {
            "Diet": "__CANONICAL_NAME__ATTR1ReY3dlsdbuv",
            "Habitat": "__CANONICAL_NAME__ATTRx8a3s6Wlt56J",
            "Height": "__CANONICAL_NAME__ATTRbTY852h1USQZ",
            "LifeSpan": "__CANONICAL_NAME__ATTRomXh7fH2nyrH",
            "Mammal": "__CANONICAL_NAME__ATTRBWlW1AbMTAlH",
            "Mass": "__CANONICAL_NAME__ATTRUiaBOgPAOiu0",
            "Order": "__CANONICAL_NAME__ATTRSn_zW_Cmyl1G",
            "Sleep": "__CANONICAL_NAME__ATTRlgjzH8Zouak4",
            "Speed": "__CANONICAL_NAME__ATTRUmG4vmDYa9CC",
          },
        },
        Cats: {
          id: "__CANONICAL_NAME__DATAlL2AlOmWYdDV",
          attribute: {
            "Age": "__CANONICAL_NAME__ATTRgxF6Y65KXTGI",
            "BodyLength": "__CANONICAL_NAME__ATTRrrw8aIZT8YfW",
            "EyeColor": "__CANONICAL_NAME__ATTRydFTiJn6OHr0",
            "Gender": "__CANONICAL_NAME__ATTRTMcETOBAbIBq",
            "Name": "__CANONICAL_NAME__ATTR9c4fIOmUIRmW",
            "PadColor": "__CANONICAL_NAME__ATTRz6jOChMIwbTW",
            "TailLength": "__CANONICAL_NAME__ATTRvuG8keOGYpe7",
            "Tail_Body_Ratio": "__CANONICAL_NAME__ATTRPDkNH9bz51th",
            "Weight": "__CANONICAL_NAME__ATTRdPSOPZAR7auo",
          },
        }
      }
    })
  })

  describe("when there are local attributes or globals with the name 'caseIndex'", () => {
    it("resolves 'caseIndex' to a special value (special value takes precedence over anything else)", () => {
      const dataSet = DataSet.create({
        id: "dataSet",
        name: "dataSet",
        attributes: [
          { id: "DATA_SET_ATTR_ID", name: "caseIndex" },
        ]
      })
      const nameMap = getDisplayNameMap({
        localDataSet: dataSet,
        dataSets: new Map([[dataSet.id, dataSet]]),
        globalValueManager: GlobalValueManager.create({
          globals: {
            GLOBAL_VAL_ID: { id: "GLOBAL_VAL_ID", name: "caseIndex", _value: 1 },
          }
        })
      })
      expect(nameMap.localNames).toEqual({
        caseIndex: localAttrIdToCanonical(CASE_INDEX_FAKE_ATTR_ID)
      })
    })
  })

  describe("when a local attribute and a global value have the same name", () => {
    it("resolves this name to the local attribute (local attributes take precedence over global values)", () => {
      const dataSet = DataSet.create({
        id: "dataSet",
        name: "dataSet",
        attributes: [
          { id: "DATA_SET_ATTR_ID", name: "fooBar" },
        ]
      })
      const nameMap = getDisplayNameMap({
        localDataSet: dataSet,
        dataSets: new Map([[dataSet.id, dataSet]]),
        globalValueManager: GlobalValueManager.create({
          globals: {
            GLOBAL_VAL_ID: { id: "GLOBAL_VAL_ID", name: "fooBar", _value: 1 },
          }
        })
      })
      expect(nameMap.localNames).toEqual(expect.objectContaining({
        fooBar: localAttrIdToCanonical("DATA_SET_ATTR_ID")
      }))
    })
  })
})

describe("getCanonicalNameMap", () => {
  it("returns a display name map", () => {
    const formulaTestEnv = getFormulaTestEnv()
    const nameMap = getCanonicalNameMap({
      localDataSet: formulaTestEnv.dataSetsByName.Mammals,
      dataSets: formulaTestEnv.dataSets,
      globalValueManager: formulaTestEnv.globalValueManager,
    })
    // Note that all the ids should be possible to find in test-utils/test-doc.json
    expect(nameMap).toEqual({
      __CANONICAL_NAME__LOCAL_ATTR_ATTRBWlW1AbMTAlH: 'Mammal',
      __CANONICAL_NAME__LOCAL_ATTR_ATTRSn_zW_Cmyl1G: 'Order',
      __CANONICAL_NAME__LOCAL_ATTR_ATTRomXh7fH2nyrH: 'LifeSpan',
      __CANONICAL_NAME__LOCAL_ATTR_ATTRbTY852h1USQZ: 'Height',
      __CANONICAL_NAME__LOCAL_ATTR_ATTRUiaBOgPAOiu0: 'Mass',
      __CANONICAL_NAME__LOCAL_ATTR_ATTRlgjzH8Zouak4: 'Sleep',
      __CANONICAL_NAME__LOCAL_ATTR_ATTRUmG4vmDYa9CC: 'Speed',
      __CANONICAL_NAME__LOCAL_ATTR_ATTRx8a3s6Wlt56J: 'Habitat',
      __CANONICAL_NAME__LOCAL_ATTR_ATTR1ReY3dlsdbuv: 'Diet',
      __CANONICAL_NAME__LOCAL_ATTR_CASE_INDEX: 'caseIndex',
      __CANONICAL_NAME__GLOBAL_VALUE_GLOBqRLnshLJT6RL: 'v1',
      __CANONICAL_NAME__GLOBAL_VALUE_GLOBsy0ZXg9dUZvt: 'v2',
      __CANONICAL_NAME__DATAJXM3nKZTmvL8: 'Mammals',
      __CANONICAL_NAME__DATAlL2AlOmWYdDV: 'Cats',
      __CANONICAL_NAME__ATTRBWlW1AbMTAlH: 'Mammal',
      __CANONICAL_NAME__ATTRSn_zW_Cmyl1G: 'Order',
      __CANONICAL_NAME__ATTRomXh7fH2nyrH: 'LifeSpan',
      __CANONICAL_NAME__ATTRbTY852h1USQZ: 'Height',
      __CANONICAL_NAME__ATTRUiaBOgPAOiu0: 'Mass',
      __CANONICAL_NAME__ATTRlgjzH8Zouak4: 'Sleep',
      __CANONICAL_NAME__ATTRUmG4vmDYa9CC: 'Speed',
      __CANONICAL_NAME__ATTRx8a3s6Wlt56J: 'Habitat',
      __CANONICAL_NAME__ATTR1ReY3dlsdbuv: 'Diet',
      __CANONICAL_NAME__ATTR9c4fIOmUIRmW: 'Name',
      __CANONICAL_NAME__ATTRTMcETOBAbIBq: 'Gender',
      __CANONICAL_NAME__ATTRgxF6Y65KXTGI: 'Age',
      __CANONICAL_NAME__ATTRdPSOPZAR7auo: 'Weight',
      __CANONICAL_NAME__ATTRrrw8aIZT8YfW: 'BodyLength',
      __CANONICAL_NAME__ATTRvuG8keOGYpe7: 'TailLength',
      __CANONICAL_NAME__ATTRydFTiJn6OHr0: 'EyeColor',
      __CANONICAL_NAME__ATTRz6jOChMIwbTW: 'PadColor',
      __CANONICAL_NAME__ATTRPDkNH9bz51th: 'Tail_Body_Ratio'
    })
  })
})

describe("localAttrIdToCanonical", () => {
  it("returns a string that is recognized by parseBasicCanonicalName as a local attribute dependency", () => {
    expect(parseBasicCanonicalName(localAttrIdToCanonical("foo"))).toEqual({ type: "localAttribute", attrId: "foo" })
  })
})

describe("globalValueIdToCanonical", () => {
  it("returns a string that is recognized by parseBasicCanonicalName as a global value dependency", () => {
    expect(parseBasicCanonicalName(globalValueIdToCanonical("foo"))).toEqual({ type: "globalValue", globalId: "foo" })
  })
})

describe("idToCanonical", () => {
  it("returns a string that is recognized as a canonical name", () => {
    expect(isCanonicalName(idToCanonical("foo"))).toBe(true)
  })
})
