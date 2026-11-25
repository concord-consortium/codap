import { fetchFeatureFlagConfig, kFeatureFlagConfigUrl, validateFeatureFlagConfig } from "./feature-flag-config"

const kFlag = "residualPlot"

function mockFetchResolving(response: Partial<Response>) {
  global.fetch = jest.fn().mockResolvedValue(response) as any
}

describe("validateFeatureFlagConfig", () => {
  it("keeps recognized flags with on/off directives", () => {
    expect(validateFeatureFlagConfig({ [kFlag]: "off" })).toEqual({ [kFlag]: "off" })
  })

  // a config written for a newer or older build must not be able to break this one
  it("drops flags that are not in the registry", () => {
    expect(validateFeatureFlagConfig({ noSuchFeature: "on" })).toEqual({})
  })

  it("drops directives that are neither on nor off", () => {
    expect(validateFeatureFlagConfig({ [kFlag]: "maybe" })).toEqual({})
  })

  it("returns an empty config for payloads that are not objects", () => {
    expect(validateFeatureFlagConfig(["on"])).toEqual({})
    expect(validateFeatureFlagConfig("on")).toEqual({})
    expect(validateFeatureFlagConfig(null)).toEqual({})
  })
})

describe("fetchFeatureFlagConfig", () => {
  const originalFetch = global.fetch
  afterEach(() => {
    global.fetch = originalFetch
  })

  it("fetches from codap-resources.concord.org directly", async () => {
    // going through codap.concord.org/codap-resources/* would cache at the
    // CloudFront edge for a day and ignore no-cache; a kill switch that takes
    // 24 hours to propagate is not a kill switch
    expect(kFeatureFlagConfigUrl.startsWith("https://codap-resources.concord.org/")).toBe(true)
  })

  it("returns the validated config on success", async () => {
    mockFetchResolving({ ok: true, json: async () => ({ [kFlag]: "off" }) })
    expect(await fetchFeatureFlagConfig()).toEqual({ [kFlag]: "off" })
  })

  it("fails open when the response is not ok", async () => {
    mockFetchResolving({ ok: false, json: async () => ({ [kFlag]: "off" }) })
    expect(await fetchFeatureFlagConfig()).toEqual({})
  })

  it("fails open when the payload is not valid json", async () => {
    mockFetchResolving({ ok: true, json: async () => { throw new Error("not json") } })
    expect(await fetchFeatureFlagConfig()).toEqual({})
  })

  it("fails open when the request rejects", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("offline")) as any
    expect(await fetchFeatureFlagConfig()).toEqual({})
  })

  it("passes an abort signal so the request cannot hang forever", async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    global.fetch = fetchMock as any
    await fetchFeatureFlagConfig()
    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal)
  })
})
