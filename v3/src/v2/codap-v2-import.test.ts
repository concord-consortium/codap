import { kV2CalculatorDGType } from "../components/calculator/calculator-defs"
import { CodapV2Document } from "./codap-v2-document"
import { ICodapV2DocumentJson, isCodapV2Document } from "./codap-v2-types"

const fs = require("fs")
const path = require("path")

describe(`V2 "bogus-document.codap"`, () => {
  const file = path.join(__dirname, "../test/v2", "bogus-document.codap")
  const bogusJson = fs.readFileSync(file, "utf8")
  const bogusData = JSON.parse(bogusJson) as ICodapV2DocumentJson

  it("should warn on invalid document reference", () => {
    jestSpyConsole("warn", spy => {
      expect(isCodapV2Document(bogusData)).toBe(false)
      const bogus = new CodapV2Document(bogusData)
      expect(bogus).toBeDefined()
      expect(spy).toHaveBeenCalledTimes(1)
    })
  })

})

describe(`V2 "calculator.codap"`, () => {
  const file = path.join(__dirname, "../test/v2", "calculator.codap")
  const calculatorJson = fs.readFileSync(file, "utf8")
  const calculatorDoc = JSON.parse(calculatorJson) as ICodapV2DocumentJson

  it("should be importable", () => {
    expect(isCodapV2Document(calculatorDoc)).toBe(true)
    expect(calculatorDoc.name).toBe("Calculator Sample")
    expect(calculatorDoc.components?.length).toBe(1)
    expect(calculatorDoc.contexts?.length).toBe(0)
    expect(calculatorDoc.globalValues?.length).toBe(0)
  })

  it("should be importable by CodapV2Document", () => {
    const calculator = new CodapV2Document(calculatorDoc)
    expect(calculator.components.length).toBe(1)
    expect(calculator.contexts.length).toBe(0)
    expect(calculator.globalValues.length).toBe(0)
    expect(calculator.dataSets.length).toBe(0)

    expect(calculator.components.map(c => c.type)).toEqual([kV2CalculatorDGType])
  })
})

describe(`V2 "mammals.codap"`, () => {

  const file = path.join(__dirname, "../test/v2", "mammals.codap")
  const mammalsJson = fs.readFileSync(file, "utf8")
  const mammalsData = JSON.parse(mammalsJson) as ICodapV2DocumentJson

  it("should be importable", () => {
    expect(isCodapV2Document(mammalsData)).toBe(true)
    expect(mammalsData.name).toBe("Mammals Sample")
    expect(mammalsData.components?.length).toBe(5)
    expect(mammalsData.contexts?.length).toBe(1)
    const context = mammalsData.contexts?.[0]
    if (! ("guid" in context)) throw new Error("Context is not a data context")
    expect(context.collections.length).toBe(1)
    expect(context.collections?.[0].attrs.length).toBe(9)
    expect(context.collections?.[0].cases.length).toBe(27)
    expect(mammalsData.globalValues?.length).toBe(0)
  })

  it("should be importable by CodapV2Document", () => {
    const mammals = new CodapV2Document(mammalsData)
    expect(mammals.components.length).toBe(5)
    expect(mammals.contexts.length).toBe(1)
    expect(mammals.globalValues.length).toBe(0)
    expect(mammals.dataSets.length).toBe(1)

    // numeric ids are converted to strings on import
    const context = mammals.dataContexts[0]
    const collection = context.collections[0]
    const data = mammals.dataSets[0].dataSet
    data.validateCases()
    expect(data.id).toBe(`DATA${context.guid}`)
    expect(data.collections[0].id).toBe(`COLL${collection.guid}`)
    expect(data.collections[0].caseIds[0]).toBe(`CASE${collection.cases[0].guid}`)
    expect(data.attributes.length).toBe(9)
    expect(data.attributes[0].id).toBe(`ATTR${collection.attrs[0].guid}`)
    expect(data.attributes[0].cid).toBe(collection.attrs[0].cid)
    expect(data.items.length).toBe(27)
    // note: mammals doesn't contain item ids

    // mammals has no parent cases
    const firstCase = collection.cases[0]
    expect(mammals.getParentCase(firstCase)).toBeUndefined()

    expect(mammals.components.map(c => c.type))
      .toEqual(["DG.TableView", "DG.GuideView", "DG.GraphView", "DG.GraphView", "DG.GraphView"])
  })
})

describe(`V2 "24cats.codap"`, () => {

  const file = path.join(__dirname, "../test/v2", "24cats.codap")
  const catsJson = fs.readFileSync(file, "utf8")
  const catsData = JSON.parse(catsJson) as ICodapV2DocumentJson

  it("should be importable", () => {
    expect(isCodapV2Document(catsData)).toBe(true)
    expect(catsData.name).toBe("24cats")
    expect(catsData.components?.length).toBe(5)
    expect(catsData.contexts?.length).toBe(1)
    const context = catsData.contexts?.[0]
    if (! ("guid" in context)) throw new Error("Context is not a data context")
    expect(context.collections.length).toBe(2)
    expect(context.collections?.[0].attrs.length).toBe(1)
    expect(context.collections?.[0].cases.length).toBe(2)
    expect(context.collections?.[1].attrs.length).toBe(8)
    expect(context.collections?.[1].cases.length).toBe(24)
    expect(catsData.globalValues?.length).toBe(0)
  })

  it("should be importable by CodapV2Document", () => {
    const cats = new CodapV2Document(catsData)
    expect(cats.components.length).toBe(5)
    expect(cats.contexts.length).toBe(1)
    expect(cats.globalValues.length).toBe(0)
    expect(cats.dataSets.length).toBe(1)

    // numeric ids are converted to strings on import
    const context = cats.dataContexts[0]
    const [v2ParentCollection, v2ChildCollection] = context.collections
    const data = cats.dataSets[0].dataSet
    data.validateCases()
    expect(data.collections.length).toBe(2)
    expect(data.collections[0].attributes.length).toBe(1)
    expect(data.attributes.length).toBe(9)
    expect(data.items.length).toBe(24)

    // sex attribute should be in parent collection
    const v2SexAttr = v2ParentCollection.attrs?.[0]
    expect(cats.getV2Attribute(v2SexAttr.guid)).toBeDefined()
    const dsSexAttr = data.collections[0].attributes[0]
    expect(dsSexAttr!.id).toBe(`ATTR${v2SexAttr.guid}`)
    expect(dsSexAttr!.name).toBe(v2SexAttr.name)
    expect(dsSexAttr!.title).toBe(v2SexAttr.title)

    // should be able to look up parent cases for child cases
    const firstParentCase = v2ParentCollection.cases[0]
    const firstChildCase = v2ChildCollection.cases[0]
    expect(data.collections[0].caseIds[0]).toBe(`CASE${firstParentCase.guid}`)
    expect(data.collections[1].caseIds[0]).toBe(`CASE${firstChildCase.guid}`)
    expect(cats.getParentCase(firstChildCase)).toBeDefined()

    expect(cats.components.map(c => c.type))
      .toEqual(["DG.TableView", "DG.GraphView", "DG.TextView", "DG.TextView", "DG.GraphView"])
  })
})
