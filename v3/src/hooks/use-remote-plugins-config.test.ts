import { renderHook, waitFor } from "@testing-library/react"
import { useRemotePluginsConfig } from "./use-remote-plugins-config"

describe("useStandardPlugins", () => {

  it("handles fetch throwing an error", async () => {
    fetchMock.mockRejectOnce(new Error())
    const spy = jest.spyOn(console, "warn").mockImplementation(() => null)
    const { result } = renderHook(() => useRemotePluginsConfig())
    await waitFor(() => {
      expect(result.current.status).not.toBe("pending")
    })
    expect(result.current.status).toBe("error")
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })

  it("handles fetch returning !ok response", async () => {
    // !ok response from fetch
    fetchMock.mockResponseOnce("[]", { status: 500 })
    const spy = jest.spyOn(console, "warn").mockImplementation(() => null)
    const { result } = renderHook(() => useRemotePluginsConfig())
    await waitFor(() => {
      expect(result.current.status).not.toBe("pending")
    })
    expect(result.current.status).toBe("error")
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })

  it("handles fetch returning empty plugins array", async () => {
    fetchMock.mockResponseOnce("[]")
    const { result } = renderHook(() => useRemotePluginsConfig())
    await waitFor(() => {
      expect(result.current.status).not.toBe("pending")
    })
    expect(result.current).toEqual({ status: "complete", plugins: [] })
  })

})
