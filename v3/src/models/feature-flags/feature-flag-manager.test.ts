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

  describe("owner-group expansion", () => {
    it("enables every flag owned by the named project", () => {
      setUrlParams("?features=MappingTime")
      const manager = new FeatureFlagManager()
      expect(manager.isFeatureEnabled("legendRange")).toBe(true)
      expect(manager.isFeatureEnabled("legendBinCount")).toBe(true)
      expect(manager.isFeatureEnabled("legendLogarithmic")).toBe(true)
    })

    it("disables every flag owned by the project when prefixed with -", () => {
      setUrlParams("?features=-MappingTime")
      const manager = new FeatureFlagManager()
      manager.setDocumentFlags(["legendRange", "legendBinCount", "legendLogarithmic"])
      expect(manager.isFeatureEnabled("legendRange")).toBe(false)
      expect(manager.isFeatureEnabled("legendBinCount")).toBe(false)
      expect(manager.isFeatureEnabled("legendLogarithmic")).toBe(false)
    })

    it("lets a later token override a member of the group", () => {
      setUrlParams("?features=MappingTime,-legendLogarithmic")
      const manager = new FeatureFlagManager()
      expect(manager.isFeatureEnabled("legendRange")).toBe(true)
      expect(manager.isFeatureEnabled("legendBinCount")).toBe(true)
      expect(manager.isFeatureEnabled("legendLogarithmic")).toBe(false)
    })

    it("records the expanded concrete flag names for document persistence", () => {
      setUrlParams("?features=MappingTime")
      const manager = new FeatureFlagManager()
      expect([...manager.urlEnabledFlags].sort())
        .toEqual(["legendBinCount", "legendLogarithmic", "legendRange"])
    })

    it("ignores a token that is neither a flag name nor an owner", () => {
      setUrlParams("?features=NoSuchProject")
      const manager = new FeatureFlagManager()
      expect(manager.urlEnabledFlags).toEqual([])
    })
  })

  // query-string yields an array rather than a string when a url parameter
  // appears more than once, a form users reach for as readily as the
  // comma-separated one
  describe("repeated features parameter", () => {
    it("combines the tokens of every occurrence", () => {
      setUrlParams("?features=MappingTime&features=ESTEEM")
      const manager = new FeatureFlagManager()
      expect(manager.isFeatureEnabled("legendRange")).toBe(true)
      expect(manager.isFeatureEnabled("residualPlot")).toBe(true)
    })

    it("applies a - prefix appearing in a later occurrence", () => {
      setUrlParams("?features=MappingTime&features=-legendLogarithmic")
      const manager = new FeatureFlagManager()
      expect(manager.isFeatureEnabled("legendRange")).toBe(true)
      expect(manager.isFeatureEnabled("legendLogarithmic")).toBe(false)
    })

    // an occurrence with no value parses as null rather than a string
    it("ignores an occurrence that carries no value", () => {
      setUrlParams("?features&features=residualPlot")
      const manager = new FeatureFlagManager()
      expect(manager.isFeatureEnabled("residualPlot")).toBe(true)
    })

    it("enables nothing when no occurrence carries a value", () => {
      setUrlParams("?features&features")
      const manager = new FeatureFlagManager()
      expect(manager.urlEnabledFlags).toEqual([])
    })

    it("records the flags of every occurrence for document persistence", () => {
      setUrlParams("?features=residualPlot&features=legendRange")
      const manager = new FeatureFlagManager()
      expect([...manager.urlEnabledFlags].sort()).toEqual(["legendRange", "residualPlot"])
    })
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
