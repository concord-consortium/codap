import { renderHook } from "@testing-library/react"
import { useSampleText } from "./use-sample-text"

const HookWrapper = () => useSampleText()

describe("useSampleText", () => {
  it("returns Hello CODAP3!", () => {
    const { result } = renderHook(HookWrapper)
    expect(result.current).toEqual("Hello CODAP3!")
  })
})
