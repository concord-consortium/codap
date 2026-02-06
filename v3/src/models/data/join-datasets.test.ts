import { AppHistoryService } from "../history/app-history-service"
import { DataSet } from "./data-set"
import { getJoinTip, joinSourceToDestCollection } from "./join-datasets"

// Mock the tile environment
jest.mock("../tiles/tile-environment", () => {
  const originalModule = jest.requireActual("../tiles/tile-environment")
  return {
    __esModule: true,
    ...originalModule,
    getFormulaManager: () => ({
      isRandomFunctionPresent: (_canonical: string) => _canonical.includes("random"),
      rerandomize: jest.fn()
    })
  }
})

// Helper to create a dataset with history service
function createDataSetWithHistory(name: string) {
  return DataSet.create({ name }, { historyService: new AppHistoryService() })
}

describe("joinSourceToDestCollection", () => {
  it("creates attributes with lookupByKey formulas when joining datasets", () => {
    // Create source dataset with some attributes
    const sourceData = createDataSetWithHistory("Mammals")
    sourceData.addAttribute({ name: "Name" })
    sourceData.addAttribute({ name: "LifeSpan" })
    sourceData.addAttribute({ name: "Diet" })

    // Create destination dataset
    const destData = createDataSetWithHistory("Cats")
    destData.addAttribute({ name: "Species" })
    destData.addAttribute({ name: "Weight" })

    const sourceNameAttr = sourceData.getAttributeByName("Name")
    const destSpeciesAttr = destData.getAttributeByName("Species")

    expect(sourceNameAttr).toBeDefined()
    expect(destSpeciesAttr).toBeDefined()

    // Perform the join: drop "Name" from Mammals onto "Species" in Cats
    const destCollection = destData.getCollectionForAttribute(destSpeciesAttr!.id)
    expect(destCollection).toBeDefined()

    const createdAttrs = joinSourceToDestCollection({
      sourceDataSet: sourceData,
      sourceKeyAttributeId: sourceNameAttr!.id,
      destDataSet: destData,
      destCollection: destCollection!,
      destKeyAttributeId: destSpeciesAttr!.id
    })

    // Should have created 2 new attributes (LifeSpan and Diet, but not Name which is the key)
    expect(createdAttrs).toBeDefined()
    expect(createdAttrs?.length).toBe(2)

    // Check that the new attributes have correct names and formulas
    const lifeSpanAttr = destData.getAttributeByName("LifeSpan")
    const dietAttr = destData.getAttributeByName("Diet")

    expect(lifeSpanAttr).toBeDefined()
    expect(dietAttr).toBeDefined()

    expect(lifeSpanAttr?.formula?.display).toBe('lookupByKey("Mammals", "LifeSpan", "Name", Species)')
    expect(dietAttr?.formula?.display).toBe('lookupByKey("Mammals", "Diet", "Name", Species)')
  })

  it("handles name conflicts by appending suffixes", () => {
    const sourceData = createDataSetWithHistory("Source")
    sourceData.addAttribute({ name: "Key" })
    sourceData.addAttribute({ name: "Data" })

    const destData = createDataSetWithHistory("Dest")
    destData.addAttribute({ name: "Key" })
    destData.addAttribute({ name: "Data" }) // Name conflict!

    const sourceKeyAttr = sourceData.getAttributeByName("Key")
    const destKeyAttr = destData.getAttributeByName("Key")
    const destCollection = destData.getCollectionForAttribute(destKeyAttr!.id)

    joinSourceToDestCollection({
      sourceDataSet: sourceData,
      sourceKeyAttributeId: sourceKeyAttr!.id,
      destDataSet: destData,
      destCollection: destCollection!,
      destKeyAttributeId: destKeyAttr!.id
    })

    // Should have created "Data2" due to name conflict (uniqueName uses suffix starting at 2)
    const dataAttr = destData.getAttributeByName("Data2")
    expect(dataAttr).toBeDefined()
    expect(dataAttr?.formula?.display).toBe('lookupByKey("Source", "Data", "Key", Key)')
  })

  it("returns nothing when source collection has only the key attribute", () => {
    const sourceData = createDataSetWithHistory("Source")
    sourceData.addAttribute({ name: "OnlyKey" })

    const destData = createDataSetWithHistory("Dest")
    destData.addAttribute({ name: "Key" })

    const sourceKeyAttr = sourceData.getAttributeByName("OnlyKey")
    const destKeyAttr = destData.getAttributeByName("Key")
    const destCollection = destData.getCollectionForAttribute(destKeyAttr!.id)

    const createdAttrs = joinSourceToDestCollection({
      sourceDataSet: sourceData,
      sourceKeyAttributeId: sourceKeyAttr!.id,
      destDataSet: destData,
      destCollection: destCollection!,
      destKeyAttributeId: destKeyAttr!.id
    })

    // No attributes should be created since source only has the key
    expect(createdAttrs).toBeUndefined()
  })
})

describe("getJoinTip", () => {
  it("generates correct join tip message", () => {
    const sourceData = DataSet.create({ _title: "Mammals" })
    sourceData.addAttribute({ name: "Name" })

    const destData = DataSet.create({ _title: "Cats" })
    destData.addAttribute({ name: "Species" })

    const sourceNameAttr = sourceData.getAttributeByName("Name")
    const destSpeciesAttr = destData.getAttributeByName("Species")

    const tip = getJoinTip(
      sourceData,
      sourceNameAttr!.id,
      destData,
      destSpeciesAttr!.id
    )

    // The tip format is: "Join %@ in %@ to %@ in %@ by matching %@ with %@"
    // Parameters: sourceCollection, sourceContext, destCollection, destContext, sourceAttr, destAttr
    expect(tip).toContain("Mammals")
    expect(tip).toContain("Cats")
    expect(tip).toContain("Name")
    expect(tip).toContain("Species")
  })

  it("returns empty string when attributes are not found", () => {
    const sourceData = DataSet.create({ name: "Source" })
    const destData = DataSet.create({ name: "Dest" })

    const tip = getJoinTip(sourceData, "nonexistent", destData, "alsoNonexistent")
    expect(tip).toBe("")
  })
})
