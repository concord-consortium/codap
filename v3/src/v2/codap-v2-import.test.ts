import { CodapV2Document } from "./codap-v2-document"
import { ICodapV2Document } from "./codap-v2-types"

const fs = require("fs")
const path = require("path")

describe(`V2 "mammals.codap"`, () => {

  const file = path.join(__dirname, "./", "mammals.codap")
  const mammalsJson = fs.readFileSync(file, "utf8")
  const mammalsData = JSON.parse(mammalsJson) as ICodapV2Document

  it("should be importable", () => {
    expect(mammalsData.name).toBe("Mammals Sample")
    expect(mammalsData.components?.length).toBe(5)
    expect(mammalsData.contexts?.length).toBe(1)
    expect(mammalsData.contexts?.[0].collections.length).toBe(1)
    expect(mammalsData.contexts?.[0].collections?.[0].attrs.length).toBe(9)
    expect(mammalsData.contexts?.[0].collections?.[0].cases.length).toBe(27)
    expect(mammalsData.globalValues?.length).toBe(0)
  })

  it("should be importable by CodapV2Document", () => {
    const mammals = new CodapV2Document(mammalsData)
    expect(mammals.components.length).toBe(5)
    expect(mammals.contexts.length).toBe(1)
    expect(mammals.globalValues.length).toBe(0)
    expect(mammals.datasets.length).toBe(1)

    const data = mammals.datasets[0]
    expect(data.attributes.length).toBe(9)
    expect(data.cases.length).toBe(27)

    expect(mammals.components.map(c => c.type))
      .toEqual(["DG.TableView", "DG.GuideView", "DG.GraphView", "DG.GraphView", "DG.GraphView"])
  })
})

describe(`V2 "24cats.codap"`, () => {

  const file = path.join(__dirname, "./", "24cats.codap")
  const catsJson = fs.readFileSync(file, "utf8")
  const catsData = JSON.parse(catsJson) as ICodapV2Document

  it("should be importable", () => {
    expect(catsData.name).toBe("24cats")
    expect(catsData.components?.length).toBe(5)
    expect(catsData.contexts?.length).toBe(1)
    expect(catsData.contexts?.[0].collections.length).toBe(2)
    expect(catsData.contexts?.[0].collections?.[0].attrs.length).toBe(1)
    expect(catsData.contexts?.[0].collections?.[0].cases.length).toBe(2)
    expect(catsData.contexts?.[0].collections?.[1].attrs.length).toBe(8)
    expect(catsData.contexts?.[0].collections?.[1].cases.length).toBe(24)
    expect(catsData.globalValues?.length).toBe(0)
  })

  it("should be importable by CodapV2Document", () => {
    const cats = new CodapV2Document(catsData)
    expect(cats.components.length).toBe(5)
    expect(cats.contexts.length).toBe(1)
    expect(cats.globalValues.length).toBe(0)
    expect(cats.datasets.length).toBe(1)

    const data = cats.datasets[0]
    expect(data.attributes.length).toBe(9)
    expect(data.cases.length).toBe(24)

    expect(cats.components.map(c => c.type))
      .toEqual(["DG.TableView", "DG.GraphView", "DG.TextView", "DG.TextView", "DG.GraphView"])
  })
})
