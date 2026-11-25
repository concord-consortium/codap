// Unlike attribute-format-utils.test.tsx, these tests use the real color parsing rather than a mock.
import { Attribute, IAttribute } from "../../models/data/attribute"
import { renderAttributeValue } from "./attribute-format-utils"

function renderedKind(attr: IAttribute, value: string) {
  const { content } = renderAttributeValue(value, NaN, attr)
  return content.props.className === "cell-color-swatch" ? "swatch" : "text"
}

describe("renderAttributeValue color swatches", () => {
  beforeAll(async () => {
    // pixi.js registers colord's names plugin globally, as it does when the app loads.
    await import("pixi.js")
  })

  it("renders color names as text in untyped attributes", () => {
    const attr = Attribute.create({ name: "a" })
    attr.addValues(["red", "blue"])
    expect(attr.type).toBe("categorical")
    expect(renderedKind(attr, "red")).toBe("text")
  })

  it("renders color names as swatches when the user type is color", () => {
    const attr = Attribute.create({ name: "a" })
    attr.addValues(["red", "blue"])
    attr.setUserType("color")
    expect(attr.type).toBe("color")
    expect(renderedKind(attr, "red")).toBe("swatch")
    expect(renderedKind(attr, "#00ff00")).toBe("swatch")
  })

  it("renders strict colors as swatches in untyped attributes", () => {
    const attr = Attribute.create({ name: "a" })
    attr.addValues(["#ff0000", "rgb(0, 0, 255)"])
    expect(attr.type).toBe("color")
    expect(renderedKind(attr, "#ff0000")).toBe("swatch")
    expect(renderedKind(attr, "rgb(0, 0, 255)")).toBe("swatch")
  })
})
