import { reaction } from "mobx"
import { DataSet, IDataSet, toCanonical } from "../../../data-model/data-set"
import { DataConfigurationModel } from "./data-configuration-model"

describe("DataConfigurationModel", () => {
  let data: IDataSet

  beforeEach(() => {
    data = DataSet.create()
    data.addAttribute({ id: "nId", name: "n" })
    data.addAttribute({ id: "xId", name: "x" })
    data.addAttribute({ id: "yId", name: "y" })
    data.addCases(toCanonical(data, [
      { __id__: "c1", n: "n1", x: 1, y: 1 }, { __id__: "c2", x: 2 }, { __id__: "c3", n: "n3", y: 3 }
    ]))
  })

  it("behaves as expected when empty", () => {
    const config = DataConfigurationModel.create()
    expect(config.defaultCaptionAttributeID).toBeUndefined()
    expect(config.attributeID("x")).toBeUndefined()
    expect(config.attributeID("y")).toBeUndefined()
    expect(config.attributeID("caption")).toBeUndefined()
    expect(config.attributeType("x")).toBeUndefined()
    expect(config.attributeType("caption")).toBeUndefined()
    expect(config.places).toEqual([])
    expect(config.attributes).toEqual([])
    expect(config.uniqueAttributes).toEqual([])
    expect(config.tipAttributes).toEqual([])
    expect(config.uniqueTipAttributes).toEqual([])
    expect(config.cases).toEqual([])
  })

  it("behaves as expected with empty/case plot", () => {
    const config = DataConfigurationModel.create()
    config.setDataset(data)
    expect(config.defaultCaptionAttributeID).toBe("nId")
    expect(config.attributeID("x")).toBeUndefined()
    expect(config.attributeID("y")).toBeUndefined()
    expect(config.attributeID("caption")).toBe("nId")
    expect(config.attributeType("x")).toBeUndefined()
    expect(config.attributeType("caption")).toBe("categorical")
    expect(config.places).toEqual(["caption"])
    expect(config.attributes).toEqual(["nId"])
    expect(config.uniqueAttributes).toEqual(["nId"])
    expect(config.tipAttributes).toEqual(["nId"])
    expect(config.uniqueTipAttributes).toEqual(["nId"])
    expect(config.cases).toEqual(["c1", "c2", "c3"])
  })

  it("behaves as expected with dot chart on x axis", () => {
    const config = DataConfigurationModel.create()
    config.setDataset(data)
    config.setAttribute("x", { attributeID: "nId" })
    expect(config.defaultCaptionAttributeID).toBe("nId")
    expect(config.attributeID("x")).toBe("nId")
    expect(config.attributeID("y")).toBeUndefined()
    expect(config.attributeID("caption")).toBe("nId")
    expect(config.attributeType("x")).toBe("categorical")
    expect(config.attributeType("caption")).toBe("categorical")
    expect(config.places).toEqual(["x", "caption"])
    expect(config.attributes).toEqual(["nId", "nId"])
    expect(config.uniqueAttributes).toEqual(["nId"])
    expect(config.tipAttributes).toEqual(["nId", "nId"])
    expect(config.uniqueTipAttributes).toEqual(["nId"])
    expect(config.cases).toEqual(["c1", "c3"])
  })

  it("behaves as expected with dot plot on x axis", () => {
    const config = DataConfigurationModel.create()
    config.setDataset(data)
    config.setAttribute("x", { attributeID: "xId" })
    expect(config.defaultCaptionAttributeID).toBe("nId")
    expect(config.attributeID("x")).toBe("xId")
    expect(config.attributeID("y")).toBeUndefined()
    expect(config.attributeID("caption")).toBe("nId")
    expect(config.attributeType("x")).toBe("numeric")
    expect(config.attributeType("caption")).toBe("categorical")
    expect(config.places).toEqual(["x", "caption"])
    expect(config.attributes).toEqual(["xId", "nId"])
    expect(config.uniqueAttributes).toEqual(["xId", "nId"])
    expect(config.tipAttributes).toEqual(["xId", "nId"])
    expect(config.uniqueTipAttributes).toEqual(["xId", "nId"])
    expect(config.cases).toEqual(["c1", "c2"])
  })

  it("behaves as expected with scatter plot and explicit caption attribute", () => {
    const config = DataConfigurationModel.create()
    config.setDataset(data)
    config.setAttribute("x", { attributeID: "xId" })
    config.setAttribute("y", { attributeID: "yId" })
    config.setAttribute("caption", { attributeID: "nId" })
    expect(config.defaultCaptionAttributeID).toBe("nId")
    expect(config.attributeID("x")).toBe("xId")
    expect(config.attributeID("y")).toBe("yId")
    expect(config.attributeID("caption")).toBe("nId")
    expect(config.attributeType("x")).toBe("numeric")
    expect(config.attributeType("y")).toBe("numeric")
    expect(config.attributeType("caption")).toBe("categorical")
    expect(config.places).toEqual(["x", "y", "caption"])
    expect(config.attributes).toEqual(["xId", "yId", "nId"])
    expect(config.uniqueAttributes).toEqual(["xId", "yId", "nId"])
    expect(config.tipAttributes).toEqual(["xId", "yId", "nId"])
    expect(config.uniqueTipAttributes).toEqual(["xId", "yId", "nId"])
    expect(config.cases).toEqual(["c1"])

    // behaves as expected after removing x axis attribute
    config.setAttribute("x")
    expect(config.defaultCaptionAttributeID).toBe("nId")
    expect(config.attributeID("x")).toBeUndefined()
    expect(config.attributeID("y")).toBe("yId")
    expect(config.attributeID("caption")).toBe("nId")
    expect(config.attributeType("x")).toBeUndefined()
    expect(config.attributeType("y")).toBe("numeric")
    expect(config.attributeType("caption")).toBe("categorical")
    expect(config.places).toEqual(["y", "caption"])
    expect(config.attributes).toEqual(["yId", "nId"])
    expect(config.uniqueAttributes).toEqual(["yId", "nId"])
    expect(config.tipAttributes).toEqual(["yId", "nId"])
    expect(config.uniqueTipAttributes).toEqual(["yId", "nId"])
    expect(config.cases).toEqual(["c1", "c3"])

    // updates cases when values change
    data.setCaseValues([{ __id__: "c2", "yId": 2 }])
    expect(config.cases).toEqual(["c1", "c2", "c3"])

    // triggers observers when values change
    const trigger = jest.fn()
    reaction(() => config.cases, () => trigger())
    expect(trigger).not.toHaveBeenCalled()
    data.setCaseValues([{ __id__: "c2", "yId": "" }])
    expect(trigger).toHaveBeenCalledTimes(1)
    expect(config.cases).toEqual(["c1", "c3"])
    data.setCaseValues([{ __id__: "c2", "yId": "2" }])
    expect(trigger).toHaveBeenCalledTimes(2)
    expect(config.cases).toEqual(["c1", "c2", "c3"])
  })

})
