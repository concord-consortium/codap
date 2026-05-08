import { TextModel } from "./text-model"
import { commitEditNotification } from "./text-notifications"

const v2Id = 12345
const v2Type = "DG.TextView"

jest.mock("../../models/tiles/tile-notifications", () => ({
  updateTileNotification: jest.fn((updateType: string, values: any, tileModel: any) => {
    if (!tileModel) return undefined
    return {
      message: {
        action: "notify",
        resource: "component",
        values: {
          operation: updateType,
          ...values,
          id: v2Id,
          type: v2Type
        }
      }
    }
  })
}))

describe("commitEditNotification", () => {
  it("emits a commitEdit notification with title and JSON-stringified slate value", () => {
    const textModel = TextModel.create()
    textModel.setTextContent("Hello")
    const tile = { title: "Notes", content: textModel } as any

    const notification = commitEditNotification(textModel, tile)

    expect(notification?.message.action).toBe("notify")
    expect(notification?.message.resource).toBe("component")
    expect(notification?.message.values.operation).toBe("commitEdit")
    expect(notification?.message.values.title).toBe("Notes")
    expect(notification?.message.values.id).toBe(v2Id)
    expect(notification?.message.values.type).toBe(v2Type)
    // V2 contract: text is JSON.stringify of the slate exchange value, not plain text
    const text = notification?.message.values.text
    expect(typeof text).toBe("string")
    const parsed = JSON.parse(text)
    expect(parsed).toEqual(textModel.value)
    expect(parsed.document).toBeDefined()
  })

  it("returns undefined when tile is missing", () => {
    const textModel = TextModel.create()
    expect(commitEditNotification(textModel, undefined)).toBeUndefined()
  })
})
