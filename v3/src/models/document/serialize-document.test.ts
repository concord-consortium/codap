import { CONFIG_SAVE_AS_V2 } from "../../lib/config"
import { createCodapDocument } from "../codap/create-codap-document"
import {
  ISerializedDocument, serializeCodapDocument, serializeCodapV2Document, serializeCodapV3Document, serializeDocument
} from "./serialize-document"

describe("serializeDocument", () => {
  it("calls prepareSnapshot before, and completeSnapshot after, the serialize function", async () => {
    const doc = createCodapDocument()
    const order: string[] = []
    jest.spyOn(doc.content!, "prepareSnapshot").mockImplementation(async () => { order.push("prepare") })
    jest.spyOn(doc.content!, "completeSnapshot").mockImplementation(() => { order.push("complete") })
    const serializeFn = jest.fn(() => { order.push("serialize"); return "result" })

    const result = await serializeDocument(doc, serializeFn)

    expect(result).toBe("result")
    expect(order).toEqual(["prepare", "serialize", "complete"])
    expect(serializeFn).toHaveBeenCalledTimes(1)
  })

  it("waits for an async serialize function to settle before completeSnapshot runs", async () => {
    const doc = createCodapDocument()
    const order: string[] = []
    jest.spyOn(doc.content!, "completeSnapshot").mockImplementation(() => { order.push("complete") })
    const serializeFn = jest.fn(async () => {
      await Promise.resolve()
      order.push("serialize-resolved")
      return "result"
    })

    const result = await serializeDocument(doc, serializeFn)

    expect(result).toBe("result")
    expect(order).toEqual(["serialize-resolved", "complete"])
  })

  it("calls completeSnapshot even when the serialize function throws", async () => {
    const doc = createCodapDocument()
    const completeSpy = jest.spyOn(doc.content!, "completeSnapshot")
    const error = new Error("serialize failed")

    await expect(serializeDocument(doc, () => { throw error })).rejects.toBe(error)

    expect(completeSpy).toHaveBeenCalledTimes(1)
  })
})

describe("serializeCodapV2Document", () => {
  it("calls prepareSnapshot and completeSnapshot exactly once per call", async () => {
    const doc = createCodapDocument()
    const prepareSpy = jest.spyOn(doc.content!, "prepareSnapshot")
    const completeSpy = jest.spyOn(doc.content!, "completeSnapshot")

    await serializeCodapV2Document(doc)

    expect(prepareSpy).toHaveBeenCalledTimes(1)
    expect(completeSpy).toHaveBeenCalledTimes(1)
  })
})

describe("serializeCodapV3Document", () => {
  it("calls prepareSnapshot and completeSnapshot exactly once per call", async () => {
    const doc = createCodapDocument()
    const prepareSpy = jest.spyOn(doc.content!, "prepareSnapshot")
    const completeSpy = jest.spyOn(doc.content!, "completeSnapshot")

    await serializeCodapV3Document(doc)

    expect(prepareSpy).toHaveBeenCalledTimes(1)
    expect(completeSpy).toHaveBeenCalledTimes(1)
  })
})

describe("serializeCodapDocument", () => {
  // Regression test for CODAP-1252. Before the fix, serializeCodapDocument wrapped its
  // v2/v3 dispatch in serializeDocument(), but the dispatched serializer also wraps
  // its work in serializeDocument(), so prepare/complete ran twice per save.
  it("calls prepareSnapshot and completeSnapshot exactly once per call", async () => {
    const doc = createCodapDocument()
    const prepareSpy = jest.spyOn(doc.content!, "prepareSnapshot")
    const completeSpy = jest.spyOn(doc.content!, "completeSnapshot")

    await serializeCodapDocument(doc)

    expect(prepareSpy).toHaveBeenCalledTimes(1)
    expect(completeSpy).toHaveBeenCalledTimes(1)
  })

  it("returns the same result as a direct call to the configured serializer", async () => {
    const doc = createCodapDocument()
    const viaDispatch = await serializeCodapDocument(doc)
    const direct = CONFIG_SAVE_AS_V2
                    ? await serializeCodapV2Document<ISerializedDocument>(doc)
                    : await serializeCodapV3Document<ISerializedDocument>(doc)
    expect(viaDispatch).toEqual(direct)
  })
})
