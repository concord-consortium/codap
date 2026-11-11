import { renderHook } from "@testing-library/react"
import { clipboardManager } from "../../lib/clipboard/clipboard-manager"
import { DataSet } from "../../models/data/data-set"
import { useClipboard } from "./use-clipboard"

describe("useClipboard", () => {
  it("delegates copying and importing to the clipboard manager", async () => {
    const copySpy = jest.spyOn(clipboardManager, "copyText").mockResolvedValue(true)
    const importSpy = jest.spyOn(clipboardManager, "importData").mockResolvedValue()
    const dataSet = DataSet.create({ name: "data" })
    const { result } = renderHook(() => useClipboard())

    await expect(result.current.copyText("a,b", "27 Cases")).resolves.toBe(true)
    expect(copySpy).toHaveBeenCalledWith("a,b", "27 Cases")

    await result.current.importData(dataSet)
    expect(importSpy).toHaveBeenCalledWith(dataSet)

    copySpy.mockRestore()
    importSpy.mockRestore()
  })

  it("returns stable callbacks across renders", () => {
    const { result, rerender } = renderHook(() => useClipboard())
    const first = result.current
    rerender()
    expect(result.current.copyText).toBe(first.copyText)
    expect(result.current.importData).toBe(first.importData)
  })
})
