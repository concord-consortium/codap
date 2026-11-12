import { appState } from "../models/app-state"
import { ISharedDataSet } from "../models/shared/shared-data-set"
import { processAction } from "./data-interactive-request-processor"

describe("boolean values a plugin sends", () => {
  const dc = "dataContext[Booleans]"

  async function request(action: "create" | "get" | "update", resource: string, values?: any) {
    const result = await processAction({ action, resource, values } as any)
    expect(result.success).toBe(true)
    return result.values as any
  }

  let sharedDataSet: ISharedDataSet

  beforeAll(async () => {
    sharedDataSet = appState.document.content!.createDataSet({
      // the attributes go into a default collection named "Cases"
      name: "Booleans",
      attributes: [{ name: "name" }, { name: "flag" }]
    } as any).sharedDataSet
    await request("create", `${dc}.item`, [
      { name: "a", flag: true }, { name: "b", flag: false }, { name: "c", flag: "" }, { name: "d", flag: true },
      { name: "e", flag: "TRUE" }
    ])
  })

  afterAll(() => {
    appState.document.content!.removeSharedModelsAndTiles([sharedDataSet])
  })

  const names = (cases: any[]) => cases.map(aCase => aCase.values.name)

  it("come back as booleans from get item, get case and get allCases, as in v2", async () => {
    expect((await request("get", `${dc}.item[0]`)).values.flag).toBe(true)
    expect((await request("get", `${dc}.item[1]`)).values.flag).toBe(false)
    expect((await request("get", `${dc}.collection[Cases].caseByIndex[0]`)).case.values.flag).toBe(true)
    const allCases = await request("get", `${dc}.collection[Cases].allCases`)
    // only the lowercase words are converted
    expect(allCases.cases.map(({ case: aCase }: any) => aCase.values.flag)).toEqual([true, false, "", true, "TRUE"])
  })

  it("match true and false in caseSearch and itemSearch, as in v2", async () => {
    expect(names(await request("get", `${dc}.collection[Cases].caseSearch[flag==true]`))).toEqual(["a", "d"])
    // v2 compared an empty value as "", which equals false (collection_client.js:474-480)
    expect(names(await request("get", `${dc}.collection[Cases].caseSearch[flag==false]`))).toEqual(["b", "c"])
    expect(names(await request("get", `${dc}.itemSearch[flag==true]`))).toEqual(["a", "d"])
    expect(names(await request("get", `${dc}.itemSearch[flag==false]`))).toEqual(["b", "c"])
  })

  it("decide caseFormulaSearch as a filter formula does, so a false value doesn't match", async () => {
    expect(names(await request("get", `${dc}.collection[Cases].caseFormulaSearch[flag]`))).toEqual(["a", "d", "e"])
  })

  it("decide a selection expression the same way", async () => {
    await request("update", `${dc}.selectionList`, { expression: "flag" })
    const selected = await request("get", `${dc}.selectionList`)
    const selectedNames = await Promise.all(selected.map(({ caseID }: any) =>
      request("get", `${dc}.collection[Cases].caseByID[${caseID}]`).then(({ case: aCase }) => aCase.values.name)))
    expect(selectedNames).toEqual(["a", "d", "e"])
  })
})
