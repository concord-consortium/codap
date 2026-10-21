import { scrollTargetIntoView } from "./scroll-into-view"

describe("scrollTargetIntoView", () => {
  it("calls scrollIntoView with smooth behavior when smooth=true", () => {
    const el = document.createElement("div")
    const spy = jest.spyOn(el, "scrollIntoView")
    scrollTargetIntoView(el, true)
    expect(spy).toHaveBeenCalledWith({ behavior: "smooth", block: "nearest", inline: "nearest" })
  })

  it("calls scrollIntoView with auto behavior when smooth=false", () => {
    const el = document.createElement("div")
    const spy = jest.spyOn(el, "scrollIntoView")
    scrollTargetIntoView(el, false)
    expect(spy).toHaveBeenCalledWith({ behavior: "auto", block: "nearest", inline: "nearest" })
  })
})
