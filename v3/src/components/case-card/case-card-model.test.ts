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
    const cases = data.getCasesForCollection(collection.id)

    const summaryListener = jest.fn()
    const dispose = reaction(
      () => cardContent.summarizedValues(xAttr, cases),
      () => summaryListener()
    )

    expect(cardContent.summarizedValues(xAttr, cases)).toBe("1-3")
    expect(summaryListener).toHaveBeenCalledTimes(0)

    // Simulate a slider-driven formula recompute mutating one case's value.
    const firstCaseId = data.items[0].__id__
    data.setComputedCaseValues([{ __id__: firstCaseId, [xAttr.id]: 99 }], [xAttr.id])

    expect(cardContent.summarizedValues(xAttr, cases)).toBe("2-99")
    expect(summaryListener).toHaveBeenCalledTimes(1)

    dispose()
  })

  it("summarizedValues reacts to categorical attribute value mutations", () => {
    const { cardContent, data } = setupCardWithDataSet()
    const cAttr = data.addAttribute({ name: "color" })
    data.addCases(toCanonical(data, [{ color: "red" }, { color: "red" }, { color: "blue" }]))
    data.validateCases()
    const collection = data.collections[0]
    const cases = data.getCasesForCollection(collection.id)

    const summaryListener = jest.fn()
    const dispose = reaction(
      () => cardContent.summarizedValues(cAttr, cases),
      () => summaryListener()
    )

    expect(cardContent.summarizedValues(cAttr, cases)).toBe("red, blue")
    expect(summaryListener).toHaveBeenCalledTimes(0)

    const lastCaseId = data.items[2].__id__
    data.setComputedCaseValues([{ __id__: lastCaseId, [cAttr.id]: "green" }], [cAttr.id])

    expect(cardContent.summarizedValues(cAttr, cases)).toBe("red, green")
    expect(summaryListener).toHaveBeenCalledTimes(1)

    dispose()
  })
})

describe("CaseCardModel summarizedValues hierarchical filtering", () => {
  // In a hierarchical dataset, when the user navigates to a single parent case, a
  // summarized child collection must reflect only that parent's children, not all the
  // cases in the child collection.
  it("restricts a numeric summary to the children of the viewed parent case", () => {
    const { cardContent, data } = setupCardWithDataSet()
    const groupAttr = data.addAttribute({ name: "group" })
    const xAttr = data.addAttribute({ name: "x" })
    data.addCases(toCanonical(data, [
      { group: "A", x: 1 },
      { group: "A", x: 5 },
      { group: "B", x: 10 },
      { group: "B", x: 20 }
    ]))
    data.moveAttributeToNewCollection(groupAttr.id)
    data.validateCases()

    const parentCollection = data.collections[0]
    const parentCases = data.getCasesForCollection(parentCollection.id)
    expect(parentCases.length).toBe(2)

    const groupAChildren = cardContent.groupChildCases(parentCases[0].__id__) ?? []
    const groupBChildren = cardContent.groupChildCases(parentCases[1].__id__) ?? []

    expect(cardContent.summarizedValues(xAttr, groupAChildren)).toBe("1-5")
    expect(cardContent.summarizedValues(xAttr, groupBChildren)).toBe("10-20")
  })

  it("restricts a categorical summary to the children of the viewed parent case", () => {
    const { cardContent, data } = setupCardWithDataSet()
    const groupAttr = data.addAttribute({ name: "group" })
    const colorAttr = data.addAttribute({ name: "color" })
    data.addCases(toCanonical(data, [
      { group: "A", color: "red" },
      { group: "A", color: "blue" },
      { group: "B", color: "green" },
      { group: "B", color: "green" }
    ]))
    data.moveAttributeToNewCollection(groupAttr.id)
    data.validateCases()

    const parentCollection = data.collections[0]
    const parentCases = data.getCasesForCollection(parentCollection.id)
    const groupAChildren = cardContent.groupChildCases(parentCases[0].__id__) ?? []
    const groupBChildren = cardContent.groupChildCases(parentCases[1].__id__) ?? []

    expect(cardContent.summarizedValues(colorAttr, groupAChildren)).toBe("red, blue")
    expect(cardContent.summarizedValues(colorAttr, groupBChildren)).toBe("green")
  })
})
