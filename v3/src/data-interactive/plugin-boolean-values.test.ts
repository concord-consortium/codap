import { appState } from "../models/app-state"
import {
  getDataSetNotificationAdapter, setDataSetNotificationAdapter
} from "../models/data/data-set-notification-adapter"
import { V2DataSetNotificationAdapter } from "../models/data/data-set-notification-adapter-v2"
import { ISharedDataSet } from "../models/shared/shared-data-set"
import { processAction } from "./data-interactive-request-processor"
import { convertDataSetToV2 } from "./data-interactive-type-utils"
import { DIAction } from "./data-interactive-types"

describe("boolean values a plugin sends", () => {
  const dc = "dataContext[Booleans]"

  async function request(action: DIAction["action"], resource: string, values?: any) {
    const result = await processAction({ action, resource, values })
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
      { name: "e", flag: "TRUE" }, { name: "f", flag: 0 }, { name: "g", flag: "FALSE" },
      // text, as typed into a table or imported from a file
      { name: "h", flag: "true" }, { name: "i", flag: "false" }
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
    // only the lowercase words are converted, whether they were sent as booleans or as text
    expect(allCases.cases.map(({ case: aCase }: any) => aCase.values.flag))
      .toEqual([true, false, "", true, "TRUE", 0, "FALSE", true, false])
  })

  it("match true and false in caseSearch and itemSearch, as in v2", async () => {
    expect(names(await request("get", `${dc}.collection[Cases].caseSearch[flag==true]`))).toEqual(["a", "d", "h"])
    // v2's caseSearch compared a falsy value as "" (collection_client.js:472-473, === at :481),
    // so an empty value and 0 equal false
    expect(names(await request("get", `${dc}.collection[Cases].caseSearch[flag==false]`)))
      .toEqual(["b", "c", "f", "i"])
    // v2's itemSearch compared with == (data_set.js:450), which also makes "" and 0 equal false
    expect(names(await request("get", `${dc}.itemSearch[flag==true]`))).toEqual(["a", "d", "h"])
    expect(names(await request("get", `${dc}.itemSearch[flag==false]`))).toEqual(["b", "c", "f", "i"])
  })

  it("decide caseFormulaSearch as a filter formula does, so a false value doesn't match", async () => {
    // the text false in any case, 0 and an empty value don't match
    expect(names(await request("get", `${dc}.collection[Cases].caseFormulaSearch[flag]`))).toEqual(["a", "d", "e", "h"])
    // nor does text that converts to 0
    expect(await request("get", `${dc}.collection[Cases].caseFormulaSearch["0.0"]`)).toEqual([])
    expect(await request("get", `${dc}.collection[Cases].caseFormulaSearch[" "]`)).toEqual([])
  })

  it("decide a selection expression the same way", async () => {
    await request("update", `${dc}.selectionList`, { expression: "flag" })
    const selected = await request("get", `${dc}.selectionList`)
    const selectedNames = await Promise.all(selected.map(({ caseID }: any) =>
      request("get", `${dc}.collection[Cases].caseByID[${caseID}]`).then(({ case: aCase }) => aCase.values.name)))
    expect(selectedNames).toEqual(["a", "d", "e", "h"])
    await request("update", `${dc}.selectionList`, [])
  })

  it("come back as booleans from get dataContext's set-aside items", async () => {
    const { case: aCase } = await request("get", `${dc}.collection[Cases].caseByIndex[0]`)
    await request("notify", dc, { request: "setAside", caseIDs: [aCase.id] })
    const { setAsideItems } = await request("get", dc)
    expect(setAsideItems.map(({ values }: any) => values.flag)).toEqual([true])
    // the document's v2 export keeps the stored text
    expect(convertDataSetToV2(sharedDataSet.dataSet).setAsideItems?.map(({ values }) => values.flag))
      .toEqual(["true"])
    await request("notify", dc, { request: "setAside", operation: "restore" })
  })

  it("come back as booleans in the cases of an updateCases notice", async () => {
    const adapter = getDataSetNotificationAdapter()
    // CODAP sends plugins v2 cases (app.tsx)
    setDataSetNotificationAdapter(V2DataSetNotificationAdapter)
    const broadcastSpy = jest.spyOn(appState.document.content!, "broadcastMessage")
    try {
      await request("update", `${dc}.collection[Cases].caseByIndex[1]`, { values: { flag: true } })
      const updateCases = broadcastSpy.mock.calls
        .map(([message]) => message)
        .filter(message => message.resource === `${dc.replace("dataContext", "dataContextChangeNotice")}`)
        .flatMap(message => ([] as any[]).concat(message.values))
        .find(({ operation }) => operation === "updateCases")
      expect(updateCases.result.cases.map((aCase: any) => aCase.values.flag)).toEqual([true])
    } finally {
      broadcastSpy.mockRestore()
      setDataSetNotificationAdapter(adapter)
      await request("update", `${dc}.collection[Cases].caseByIndex[1]`, { values: { flag: false } })
    }
  })
})
