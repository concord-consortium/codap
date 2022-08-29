import { CodapV2Document } from "./codap-v2-document"
import { ICodapV2Document } from "./codap-v2-types"

const fs = require("fs")
const path = require("path")

const file = path.join(__dirname, "./", "Mammals Sample.codap")
const mammalsJson = fs.readFileSync(file, "utf8")
const mammalsData = JSON.parse(mammalsJson) as ICodapV2Document

describe(`V2 "Mammals Sample.codap"`, () => {
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
