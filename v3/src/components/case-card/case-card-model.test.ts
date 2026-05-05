import { reaction } from "mobx"
import { createCodapDocument } from "../../models/codap/create-codap-document"
import { toCanonical } from "../../models/data/data-set"
import { linkTileToDataSet } from "../../models/document/data-set-linking"
import { DataSetMetadata } from "../../models/shared/data-set-metadata"
import { SharedDataSet } from "../../models/shared/shared-data-set"
import { TileModel } from "../../models/tiles/tile-model"
import { CaseCardModel } from "./case-card-model"
import "./case-card-registration"

function setupCardWithDataSet() {
  const document = createCodapDocument(undefined, { noGlobals: true })
  const cardContent = CaseCardModel.create()
  const tile = TileModel.create({ content: cardContent })
  document.addTile(tile)
  const sharedDataSet = SharedDataSet.create()
  document.content?.addSharedModel(sharedDataSet)
  const sharedMetadata = DataSetMetadata.create()
  document.content?.addSharedModel(sharedMetadata)
  sharedMetadata.setData(sharedDataSet.dataSet)
  linkTileToDataSet(tile, sharedDataSet.dataSet)
  return { cardContent, data: sharedDataSet.dataSet }
}

describe("CaseCardModel reactivity", () => {
  // CODAP-1290: Case card value displays don't update when values change externally
  // (e.g. computed values updated by dragging a slider). The summarizedValues view
  // must establish a MobX dependency that fires when underlying attribute values
  // mutate so observers re-render.
  it("summarizedValues reacts to numeric attribute value mutations", () => {
    const { cardContent, data } = setupCardWithDataSet()
    const xAttr = data.addAttribute({ name: "x" })
    data.addCases(toCanonical(data, [{ x: 1 }, { x: 2 }, { x: 3 }]))
    const collection = data.collections[0]

    const summaryListener = jest.fn()
    const dispose = reaction(
      () => cardContent.summarizedValues(xAttr, collection),
      () => summaryListener()
    )

    expect(cardContent.summarizedValues(xAttr, collection)).toBe("1-3")
    expect(summaryListener).toHaveBeenCalledTimes(0)

    // Simulate a slider-driven formula recompute mutating one case's value.
    const firstCaseId = data.items[0].__id__
    data.setComputedCaseValues([{ __id__: firstCaseId, [xAttr.id]: 99 }], [xAttr.id])

    expect(cardContent.summarizedValues(xAttr, collection)).toBe("2-99")
    expect(summaryListener).toHaveBeenCalledTimes(1)

    dispose()
  })

  it("summarizedValues reacts to categorical attribute value mutations", () => {
    const { cardContent, data } = setupCardWithDataSet()
    const cAttr = data.addAttribute({ name: "color" })
    data.addCases(toCanonical(data, [{ color: "red" }, { color: "red" }, { color: "blue" }]))
    data.validateCases()
    const collection = data.collections[0]

    const summaryListener = jest.fn()
    const dispose = reaction(
      () => cardContent.summarizedValues(cAttr, collection),
      () => summaryListener()
    )

    expect(cardContent.summarizedValues(cAttr, collection)).toBe("red, blue")
    expect(summaryListener).toHaveBeenCalledTimes(0)

    const lastCaseId = data.items[2].__id__
    data.setComputedCaseValues([{ __id__: lastCaseId, [cAttr.id]: "green" }], [cAttr.id])

    expect(cardContent.summarizedValues(cAttr, collection)).toBe("red, green")
    expect(summaryListener).toHaveBeenCalledTimes(1)

    dispose()
  })
})
