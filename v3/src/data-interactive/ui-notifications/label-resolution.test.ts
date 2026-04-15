import { resolveLabel } from "./label-resolution"

describe("resolveLabel", () => {
  beforeEach(() => { document.body.innerHTML = "" })

  it("returns aria-label when present", () => {
    const el = document.createElement("button")
    el.setAttribute("aria-label", "Close")
    expect(resolveLabel(el)).toBe("Close")
  })

  it("returns aria-labelledby textContent when aria-label absent", () => {
    document.body.innerHTML = `
      <span id="lbl">Open file</span>
      <button aria-labelledby="lbl" id="btn"></button>`
    expect(resolveLabel(document.getElementById("btn"))).toBe("Open file")
  })

  it("returns own textContent trimmed when 2+ chars with alphanumeric", () => {
    const el = document.createElement("button")
    el.textContent = "  OK  "
    expect(resolveLabel(el)).toBe("OK")
  })

  it("omits single-char glyphs like ×, +", () => {
    const x = document.createElement("button")
    x.textContent = "×"
    expect(resolveLabel(x)).toBeUndefined()
    const p = document.createElement("button")
    p.textContent = "+"
    expect(resolveLabel(p)).toBeUndefined()
  })

  it("omits non-alphanumeric 2-char strings", () => {
    const el = document.createElement("button")
    el.textContent = "!!"
    expect(resolveLabel(el)).toBeUndefined()
  })

  it("returns undefined when empty", () => {
    const el = document.createElement("button")
    expect(resolveLabel(el)).toBeUndefined()
  })
})
