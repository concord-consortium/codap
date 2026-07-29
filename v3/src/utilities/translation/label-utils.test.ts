import { stripTrailingColon, stripTrailingEllipsis } from "./label-utils"

describe("stripTrailingColon", () => {
  it("removes a trailing colon", () => {
    expect(stripTrailingColon("Attribute Name:")).toBe("Attribute Name")
    expect(stripTrailingColon("Formula:")).toBe("Formula")
    expect(stripTrailingColon("Name des Merkmals:")).toBe("Name des Merkmals")
  })

  it("removes a full-width colon and surrounding whitespace", () => {
    // e.g. the Japanese and Chinese translations
    expect(stripTrailingColon("属性名：")).toBe("属性名")
    expect(stripTrailingColon("Formula : ")).toBe("Formula")
  })

  it("leaves a label without a trailing colon untouched", () => {
    expect(stripTrailingColon("Formula")).toBe("Formula")
    expect(stripTrailingColon("")).toBe("")
    // adornment banners pass a prompt ending in "="
    expect(stripTrailingColon("LifeSpan =")).toBe("LifeSpan =")
  })

  it("leaves interior colons alone", () => {
    expect(stripTrailingColon("Ratio a:b")).toBe("Ratio a:b")
  })
})

describe("stripTrailingEllipsis", () => {
  it("removes a three-dot ellipsis", () => {
    expect(stripTrailingEllipsis("Edit Formula...")).toBe("Edit Formula")
    expect(stripTrailingEllipsis("Add Filter Formula...")).toBe("Add Filter Formula")
  })

  it("removes a single-character ellipsis", () => {
    // e.g. the Japanese translation
    expect(stripTrailingEllipsis("Edit Formula…")).toBe("Edit Formula")
    expect(stripTrailingEllipsis("式を編集する…")).toBe("式を編集する")
  })

  it("removes a two-dot ellipsis", () => {
    // e.g. the Hebrew translation
    expect(stripTrailingEllipsis("ערוך נוסחה..")).toBe("ערוך נוסחה")
  })

  it("removes an ellipsis followed by whitespace", () => {
    // e.g. the Thai translation
    expect(stripTrailingEllipsis("แก้ไขสูตร... ")).toBe("แก้ไขสูตร")
  })

  it("leaves a single trailing period alone", () => {
    expect(stripTrailingEllipsis("Edit Formula.")).toBe("Edit Formula.")
  })

  it("removes trailing whitespace after the ellipsis", () => {
    expect(stripTrailingEllipsis("Edit Formula... ")).toBe("Edit Formula")
  })

  it("leaves a label without an ellipsis untouched", () => {
    expect(stripTrailingEllipsis("Plotted Value")).toBe("Plotted Value")
    expect(stripTrailingEllipsis("")).toBe("")
  })

  it("leaves interior dots alone", () => {
    expect(stripTrailingEllipsis("N.B. Edit Formula")).toBe("N.B. Edit Formula")
    expect(stripTrailingEllipsis("A...B")).toBe("A...B")
  })
})
