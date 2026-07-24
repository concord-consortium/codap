import { autorun } from "mobx"
import { setUrlParams } from "../../utilities/url-params"
import { FeatureFlagManager } from "./feature-flag-manager"

// a name that is present in the registry; see feature-flag-registry.ts
const kFlag = "residualPlot"

describe("FeatureFlagManager", () => {
  afterEach(() => {
    setUrlParams("")
  })

  it("enables a feature named by the features url parameter", () => {
    setUrlParams(`?features=${kFlag}`)
    const manager = new FeatureFlagManager()
    expect(manager.isFeatureEnabled(kFlag)).toBe(true)
  })

  it("enables a feature granted by the open document", () => {
    const manager = new FeatureFlagManager()
    manager.setDocumentFlags([kFlag])
    expect(manager.isFeatureEnabled(kFlag)).toBe(true)
  })

  it("lets a url parameter prefixed with - override a document grant", () => {
    setUrlParams(`?features=-${kFlag}`)
    const manager = new FeatureFlagManager()
    manager.setDocumentFlags([kFlag])
    expect(manager.isFeatureEnabled(kFlag)).toBe(false)
  })

  it("enables a feature the server config marks on", () => {
    const manager = new FeatureFlagManager()
    manager.setServerConfig({ [kFlag]: "on" })
    expect(manager.isFeatureEnabled(kFlag)).toBe(true)
  })

  it("lets the url disable a feature the server config marks on", () => {
    setUrlParams(`?features=-${kFlag}`)
    const manager = new FeatureFlagManager()
    manager.setServerConfig({ [kFlag]: "on" })
    expect(manager.isFeatureEnabled(kFlag)).toBe(false)
  })

  // the kill switch: pilot urls circulate beyond the people they were sent to,
  // so a server "off" has to reach every session regardless of anyone's url
  it("keeps a feature off when the server config marks it off, even if the url enables it", () => {
    setUrlParams(`?features=${kFlag}`)
    const manager = new FeatureFlagManager()
    manager.setServerConfig({ [kFlag]: "off" })
    expect(manager.isFeatureEnabled(kFlag)).toBe(false)
  })

  it("keeps a feature off when the server config marks it off, even if a document grants it", () => {
    const manager = new FeatureFlagManager()
    manager.setDocumentFlags([kFlag])
    manager.setServerConfig({ [kFlag]: "off" })
    expect(manager.isFeatureEnabled(kFlag)).toBe(false)
  })

  it("ignores url flag names that are not in the registry", () => {
    setUrlParams("?features=noSuchFeature")
    const manager = new FeatureFlagManager()
    expect(manager.isFeatureEnabled("noSuchFeature" as any)).toBe(false)
  })

  // gates are reactive reads, so a config fetch that lands after render takes
  // effect without a reload
  it("notifies observers when a late server directive changes a flag", () => {
    const manager = new FeatureFlagManager()
    const observed: boolean[] = []
    const dispose = autorun(() => observed.push(manager.isFeatureEnabled(kFlag)))

    manager.setServerConfig({ [kFlag]: "on" })
    dispose()

    expect(observed).toEqual([false, true])
  })

  it("notifies observers when the open document's grants change", () => {
    const manager = new FeatureFlagManager()
    const observed: boolean[] = []
    const dispose = autorun(() => observed.push(manager.isFeatureEnabled(kFlag)))

    manager.setDocumentFlags([kFlag])
    dispose()

    expect(observed).toEqual([false, true])
  })

  it("applies the server config it loads", async () => {
    const manager = new FeatureFlagManager()
    await manager.loadServerConfig(async () => ({ [kFlag]: "on" }))
    expect(manager.isFeatureEnabled(kFlag)).toBe(true)
  })

  // called fire-and-forget at module load, so a rejection must not escape
  it("fails open when the config loader rejects", async () => {
    const manager = new FeatureFlagManager()
    manager.setDocumentFlags([kFlag])
    await expect(manager.loadServerConfig(async () => { throw new Error("boom") })).resolves.toBeUndefined()
    expect(manager.isFeatureEnabled(kFlag)).toBe(true)
  })

  describe("urlEnabledFlags", () => {
    it("reports flags this session enabled via the url", () => {
      setUrlParams(`?features=${kFlag}`)
      const manager = new FeatureFlagManager()
      expect(manager.urlEnabledFlags).toEqual([kFlag])
    })

    it("omits flags the url disabled", () => {
      setUrlParams(`?features=-${kFlag}`)
      const manager = new FeatureFlagManager()
      expect(manager.urlEnabledFlags).toEqual([])
    })

    // persisting these would bake a grant into every document saved during the
    // feature's general-availability window, resurrecting it for those documents
    // after the feature is later turned off
    it("omits flags that are only on because the server config marks them on", () => {
      const manager = new FeatureFlagManager()
      manager.setServerConfig({ [kFlag]: "on" })
      expect(manager.isFeatureEnabled(kFlag)).toBe(true)
      expect(manager.urlEnabledFlags).toEqual([])
    })

    it("omits url-enabled flags the server config has killed", () => {
      setUrlParams(`?features=${kFlag}`)
      const manager = new FeatureFlagManager()
      manager.setServerConfig({ [kFlag]: "off" })
      expect(manager.urlEnabledFlags).toEqual([])
    })
  })
})
