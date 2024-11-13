import { createDataSet } from "../../data/data-set-conversion"
import { GlobalValueManager } from "../../global/global-value-manager"
import { getFormulaTestEnv } from "../test-utils/formula-test-utils"
import {
  basicCanonicalNameToDependency, CANONICAL_NAME, CASE_INDEX_FAKE_ATTR_ID, getCanonicalNameMap, getDisplayNameMap,
  GLOBAL_VALUE, globalValueIdToCanonical, idToCanonical, isCanonicalName, LOCAL_ATTR, localAttrIdToCanonical,
  rmCanonicalPrefix, safeSymbolName
} from "./name-mapping-utils"

describe("localAttrIdToCanonical", () => {
  it("returns a string that is recognized by basicCanonicalNameToDependency as a local attribute dependency", () => {
    const dependency = basicCanonicalNameToDependency(localAttrIdToCanonical("foo"))
    expect(dependency).toEqual({ type: "localAttribute", attrId: "foo" })
  })
})

describe("globalValueIdToCanonical", () => {
  it("returns a string that is recognized by basicCanonicalNameToDependency as a global value dependency", () => {
    const dependency = basicCanonicalNameToDependency(globalValueIdToCanonical("foo"))
    expect(dependency).toEqual({ type: "globalValue", globalId: "foo" })
  })
})

describe("idToCanonical", () => {
  it("returns a string that is recognized as a canonical name", () => {
    expect(isCanonicalName(idToCanonical("foo"))).toBe(true)
  })
})

describe("isCanonicalName", () => {
  it("returns true if the name starts with the canonical name", () => {
    expect(isCanonicalName(`${CANONICAL_NAME}TEST`)).toBe(true)
  })
  it("returns false if the name does not start with the canonical name", () => {
    expect(isCanonicalName("FOO_BAR")).toBe(false)
  })
  it("returns false if the name is undefined or unexpected type", () => {
    expect(isCanonicalName(undefined)).toBe(false)
    expect(isCanonicalName(1)).toBe(false)
    expect(isCanonicalName({})).toBe(false)
    expect(isCanonicalName([])).toBe(false)
  })
})

describe("rmCanonicalPrefix", () => {
  it("removes the canonical prefix from the name", () => {
    expect(rmCanonicalPrefix(`${CANONICAL_NAME}TEST`)).toBe("TEST")
  })
  it("returns the original name if it does not start with the canonical name", () => {
    expect(rmCanonicalPrefix("FOO_BAR")).toBe("FOO_BAR")
  })
  it("returns the if the name is undefined or unexpected type", () => {
    expect(rmCanonicalPrefix(undefined)).toEqual(undefined)
    expect(rmCanonicalPrefix(1)).toEqual(1)
    expect(rmCanonicalPrefix({})).toEqual({})
    expect(rmCanonicalPrefix([])).toEqual([])
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
      const dataSet = createDataSet({
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
      const dataSet = createDataSet({
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

describe("basicCanonicalNameToDependency", () => {
  it("returns undefined if the name is not a canonical name", () => {
    const name = "FOO_BAR"
    const result = basicCanonicalNameToDependency(name)
    expect(result).toBeUndefined()
  })
  it("returns a local attribute dependency if the name starts with the local attribute prefix", () => {
    const name = `${CANONICAL_NAME}${LOCAL_ATTR}foo`
    const result = basicCanonicalNameToDependency(name)
    expect(result).toEqual({ type: "localAttribute", attrId: "foo" })
  })
  it("returns a global value dependency if the name starts with the global value prefix", () => {
    const name = `${CANONICAL_NAME}${GLOBAL_VALUE}bar`
    const result = basicCanonicalNameToDependency(name)
    expect(result).toEqual({ type: "globalValue", globalId: "bar" })
  })
})
