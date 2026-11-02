import { renderHook, waitFor } from "@testing-library/react"
import { IOssLibrary, resetOssLibrariesRequest, useOssLibraries } from "./use-oss-libraries"

const kLibraries: IOssLibrary[] = [{ name: "d3", version: "7.9.0", license: "ISC" }]

function mockFetch(response: Partial<Response>) {
  global.fetch = jest.fn().mockResolvedValue(response)
}

describe("useOssLibraries", () => {
  beforeEach(() => {
    resetOssLibrariesRequest()
  })

  it("loads the library list", async () => {
    mockFetch({ ok: true, json: () => Promise.resolve(kLibraries) })
    const { result } = renderHook(() => useOssLibraries(true))
    expect(result.current).toEqual({ status: "loading" })
    await waitFor(() => expect(result.current).toEqual({ status: "loaded", libraries: kLibraries }))
    expect(global.fetch).toHaveBeenCalledWith("oss-libraries.json")
  })

  it("doesn't fetch until enabled", () => {
    mockFetch({ ok: true, json: () => Promise.resolve(kLibraries) })
    renderHook(() => useOssLibraries(false))
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("reports an error when the request fails", async () => {
    mockFetch({ ok: false, status: 404 })
    const { result } = renderHook(() => useOssLibraries(true))
    await waitFor(() => expect(result.current).toEqual({ status: "error" }))
  })

  it("reuses the request", async () => {
    mockFetch({ ok: true, json: () => Promise.resolve(kLibraries) })
    const { result: firstResult } = renderHook(() => useOssLibraries(true))
    await waitFor(() => expect(firstResult.current.status).toBe("loaded"))
    const { result: secondResult } = renderHook(() => useOssLibraries(true))
    await waitFor(() => expect(secondResult.current.status).toBe("loaded"))
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it("tries again after a failure", async () => {
    mockFetch({ ok: false, status: 500 })
    const { result: firstResult } = renderHook(() => useOssLibraries(true))
    await waitFor(() => expect(firstResult.current.status).toBe("error"))
    mockFetch({ ok: true, json: () => Promise.resolve(kLibraries) })
    const { result: secondResult } = renderHook(() => useOssLibraries(true))
    await waitFor(() => expect(secondResult.current.status).toBe("loaded"))
  })
})
