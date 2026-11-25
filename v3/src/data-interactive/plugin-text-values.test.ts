import { when } from "mobx"
import { appState } from "../models/app-state"
import {
  getDataSetNotificationAdapter, setDataSetNotificationAdapter
} from "../models/data/data-set-notification-adapter"
import { V2DataSetNotificationAdapter } from "../models/data/data-set-notification-adapter-v2"
import { AttributeFormulaAdapter } from "../models/formula/attribute-formula-adapter"
import { FormulaManager } from "../models/formula/formula-manager"
import { ISharedDataSet } from "../models/shared/shared-data-set"
import { getFormulaManager } from "../models/tiles/tile-environment"
import { processAction } from "./data-interactive-request-processor"
import { DIAction } from "./data-interactive-types"
import { toPluginValue } from "./data-interactive-utils"

describe("toPluginValue", () => {
  it("reads stored text as a number only when it's how JavaScript writes that number", () => {
    expect(toPluginValue("12")).toBe(12)
    expect(toPluginValue("-3.5")).toBe(-3.5)
    expect(toPluginValue("0.30000000000000004")).toBe(0.30000000000000004)
    expect(toPluginValue("1e+21")).toBe(1e21)
    // as in v2, which returned the number Infinity a plugin sent or a formula such as 1/0 computed
    expect(toPluginValue("Infinity")).toBe(Infinity)
    expect(toPluginValue("-Infinity")).toBe(-Infinity)
    for (const text of ["0x1F", "1e3", "$12.50", "02134", "12.50", ".5", "+5", "-0", "+Infinity", "infinity", "NaN",
      "abc", ""]) {
      expect(toPluginValue(text)).toBe(text)
    }
    expect(toPluginValue("true")).toBe(true)
    expect(toPluginValue("false")).toBe(false)
    expect(toPluginValue(undefined)).toBeUndefined()
  })
})

describe("values a plugin sends as text", () => {
  const dc = "dataContext[Texts]"

  async function request(action: DIAction["action"], resource: string, values?: any) {
    const result = await processAction({ action, resource, values })
    expect(result.success).toBe(true)
    return result.values as any
  }

  let sharedDataSet: ISharedDataSet
  const sent = ["0x1F", "1e3", "02134", "12.50", "abc", 12, "12", 0.5, -3]

  beforeAll(async () => {
    sharedDataSet = appState.document.content!.createDataSet({
      // the attributes go into a default collection named "Cases"
      name: "Texts",
      attributes: [{ name: "name" }, { name: "code" }, { name: "price" }]
    } as any).sharedDataSet
    await request("update", `${dc}.collection[Cases].attribute[price]`, { type: "numeric" })
    await request("create", `${dc}.item`, sent.map((code, index) => ({
      name: `n${index}`, code, price: index === 0 ? "$12.50" : index
    })))
  })

  afterAll(() => {
    appState.document.content!.removeSharedModelsAndTiles([sharedDataSet])
  })

  // as in v2, which returned each value as sent; "12" and 12 can't be told apart, so both come back as 12
  const expected = ["0x1F", "1e3", "02134", "12.50", "abc", 12, 12, 0.5, -3]

  it("come back as sent from get item, get case and get allCases", async () => {
    expect((await request("get", `${dc}.item[0]`)).values.code).toBe("0x1F")
    expect((await request("get", `${dc}.itemByID[${(await request("get", `${dc}.item[2]`)).id}]`)).values.code)
      .toBe("02134")
    expect((await request("get", `${dc}.collection[Cases].caseByIndex[1]`)).case.values.code).toBe("1e3")
    const allCases = await request("get", `${dc}.collection[Cases].allCases`)
    expect(allCases.cases.map(({ case: aCase }: any) => aCase.values.code)).toEqual(expected)
    const items = await request("get", `${dc}.itemSearch[*]`)
    expect(items.map(({ values }: any) => values.code)).toEqual(expected)
  })

  it("come back as sent from caseFormulaSearch", async () => {
    const cases = await request("get", `${dc}.collection[Cases].caseFormulaSearch[name="n1"]`)
    expect(cases.map(({ values }: any) => values.code)).toEqual(["1e3"])
  })

  it("come back as sent, or as the number, while values are cached during a drag", async () => {
    const { dataSet } = sharedDataSet
    const codeId = dataSet.attrIDFromName("code")!
    dataSet.beginCaching()
    try {
      dataSet.setCaseValues([
        { __id__: dataSet.itemIds[2], [codeId]: "02135" }, { __id__: dataSet.itemIds[5], [codeId]: 13 }
      ])
      expect((await request("get", `${dc}.item[2]`)).values.code).toBe("02135")
      expect((await request("get", `${dc}.item[5]`)).values.code).toBe(13)
    } finally {
      dataSet.clearCache()
      dataSet._endCaching()
    }
  })

  it("keep the symbols of a value in a numeric attribute", async () => {
    const { values } = await request("get", `${dc}.item[0]`)
    expect(values.price).toBe("$12.50")
    expect((await request("get", `${dc}.item[1]`)).values.price).toBe(1)
  })

  it("are still searched by the number they read as", async () => {
    const names = (cases: any[]) => cases.map(aCase => aCase.values.name)
    expect(names(await request("get", `${dc}.itemSearch[code==31]`))).toEqual(["n0"])
    expect(names(await request("get", `${dc}.itemSearch[code==12.5]`))).toEqual(["n3"])
    expect(names(await request("get", `${dc}.collection[Cases].caseSearch[code==02134]`))).toEqual(["n2"])
    // a numeric attribute reads "$12.50" as 12.5
    expect(names(await request("get", `${dc}.itemSearch[price==12.5]`))).toEqual(["n0"])
  })

  it("come back as sent from get dataContext's set-aside items", async () => {
    const { case: aCase } = await request("get", `${dc}.collection[Cases].caseByIndex[0]`)
    await request("notify", dc, { request: "setAside", caseIDs: [aCase.id] })
    const { setAsideItems } = await request("get", dc)
    expect(setAsideItems.map(({ values }: any) => [values.code, values.price])).toEqual([["0x1F", "$12.50"]])
    await request("notify", dc, { request: "setAside", operation: "restore" })
  })

  it("come back as sent in the cases of an updateCases notice", async () => {
    const adapter = getDataSetNotificationAdapter()
    // CODAP sends plugins v2 cases (app.tsx)
    setDataSetNotificationAdapter(V2DataSetNotificationAdapter)
    const broadcastSpy = jest.spyOn(appState.document.content!, "broadcastMessage")
    try {
      await request("update", `${dc}.collection[Cases].caseByIndex[4]`, { values: { code: "0x2A" } })
      const updateCases = broadcastSpy.mock.calls
        .map(([message]) => message)
        .filter(message => message.resource === `${dc.replace("dataContext", "dataContextChangeNotice")}`)
        .flatMap(message => ([] as any[]).concat(message.values))
        .find(({ operation }) => operation === "updateCases")
      expect(updateCases.result.cases.map((aCase: any) => aCase.values.code)).toEqual(["0x2A"])
    } finally {
      broadcastSpy.mockRestore()
      setDataSetNotificationAdapter(adapter)
      await request("update", `${dc}.collection[Cases].caseByIndex[4]`, { values: { code: "abc" } })
    }
  })
})

describe("infinite values", () => {
  const dc = "dataContext[Infinities]"
  let sharedDataSet: ISharedDataSet

  beforeAll(async () => {
    // compute formulas, as app.tsx arranges in the app
    AttributeFormulaAdapter.register()
    const formulaManager = getFormulaManager(appState.document) as FormulaManager
    await when(() => formulaManager.areAdaptersInitialized, { timeout: 1000 })
    sharedDataSet = appState.document.content!.createDataSet({
      name: "Infinities",
      attributes: [{ name: "value" }]
    } as any).sharedDataSet
    await processAction({
      action: "create", resource: `${dc}.item`, values: [{ value: Infinity }, { value: "-Infinity" }, { value: 1 }]
    })
    await processAction({
      action: "create", resource: `${dc}.collection[Cases].attribute`, values: { name: "ratio", formula: "1/0" }
    })
  })

  afterAll(() => {
    appState.document.content!.removeSharedModelsAndTiles([sharedDataSet])
  })

  it("read back as numbers, as in v2", async () => {
    const { values } = await processAction({ action: "get", resource: `${dc}.itemSearch[*]` }) as any
    expect(values.map(({ values: { value } }: any) => value)).toEqual([Infinity, -Infinity, 1])
    expect(values.map(({ values: { ratio } }: any) => ratio)).toEqual([Infinity, Infinity, Infinity])
    const allCases = await processAction({ action: "get", resource: `${dc}.collection[Cases].allCases` }) as any
    const { cases } = allCases.values
    expect(cases.map(({ case: aCase }: any) => aCase.values.value)).toEqual([Infinity, -Infinity, 1])
  })
})

describe("values in a child collection's parent case", () => {
  const dc = "dataContext[Parents]"
  let sharedDataSet: ISharedDataSet

  beforeAll(async () => {
    sharedDataSet = appState.document.content!.createDataSet({
      name: "Parents",
      attributes: [{ name: "code" }, { name: "child" }]
    } as any).sharedDataSet
    await processAction({ action: "create", resource: `${dc}.item`, values: [{ code: "0x1F", child: "c1" }] })
    await processAction({
      action: "create", resource: `${dc}.collection`, values: { name: "Codes", parent: "_root", attributes: [] }
    })
    await processAction({
      action: "update", resource: `${dc}.collection[Cases].attributeLocation[code]`, values: { collection: "Codes" }
    })
  })

  afterAll(() => {
    appState.document.content!.removeSharedModelsAndTiles([sharedDataSet])
  })

  it("come back as sent from get caseByIndex and allCases", async () => {
    const get = async (resource: string) => (await processAction({ action: "get", resource })).values as any
    expect((await get(`${dc}.collection[Codes].caseByIndex[0]`)).case.values.code).toBe("0x1F")
    const { cases } = await get(`${dc}.collection[Codes].allCases`)
    expect(cases.map(({ case: aCase }: any) => aCase.values.code)).toEqual(["0x1F"])
  })
})

describe("get attribute's type", () => {
  const dc = "dataContext[Types]"
  let sharedDataSet: ISharedDataSet

  beforeAll(async () => {
    sharedDataSet = appState.document.content!.createDataSet({
      name: "Types",
      attributes: [{ name: "inferred" }, { name: "chosen" }]
    } as any).sharedDataSet
    await processAction({ action: "create", resource: `${dc}.item`, values: [{ inferred: 1, chosen: 2 }] })
    await processAction({
      action: "update", resource: `${dc}.collection[Cases].attribute[chosen]`, values: { type: "numeric" }
    })
  })

  afterAll(() => {
    appState.document.content!.removeSharedModelsAndTiles([sharedDataSet])
  })

  it("is null when no one has set it, as in v2", async () => {
    const get = async (resource: string) => (await processAction({ action: "get", resource })).values as any
    expect((await get(`${dc}.collection[Cases].attribute[inferred]`)).type).toBeNull()
    expect((await get(`${dc}.collection[Cases].attribute[chosen]`)).type).toBe("numeric")
    const { attrs } = await get(`${dc}.collection[Cases]`)
    expect(attrs.map(({ type }: any) => type)).toEqual([null, "numeric"])
    const { collections } = await get(dc)
    expect(collections[0].attrs.map(({ type }: any) => type)).toEqual([null, "numeric"])
  })

  it("is null in an attribute notice when no one has set it", async () => {
    const adapter = getDataSetNotificationAdapter()
    setDataSetNotificationAdapter(V2DataSetNotificationAdapter)
    const broadcastSpy = jest.spyOn(appState.document.content!, "broadcastMessage")
    try {
      await processAction({ action: "create", resource: `${dc}.collection[Cases].attribute`, values: { name: "more" } })
      const notice = broadcastSpy.mock.calls
        .map(([message]) => message)
        .flatMap(message => ([] as any[]).concat(message.values))
        .find(values => values?.operation === "createAttributes")
      expect(notice.result.attrs.map(({ type }: any) => type)).toEqual([null])
    } finally {
      broadcastSpy.mockRestore()
      setDataSetNotificationAdapter(adapter)
    }
  })
})
