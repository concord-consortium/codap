import { flagsForOwner, isFeatureFlagName, isFeatureFlagOwner, kFeatureFlags } from "./feature-flag-registry"

const kLegendFlags = ["legendBinCount", "legendLogarithmic", "legendRange"] as const

describe("feature flag registry", () => {
  it("registers the MappingTime legend flags", () => {
    kLegendFlags.forEach(name => {
      expect(isFeatureFlagName(name)).toBe(true)
      expect(kFeatureFlags[name].owner).toBe("MappingTime")
    })
  })
})

describe("owner helpers", () => {
  it("recognizes a registered owner and rejects an unknown one", () => {
    expect(isFeatureFlagOwner("MappingTime")).toBe(true)
    expect(isFeatureFlagOwner("NoSuchProject")).toBe(false)
  })

  it("returns every flag owned by a project", () => {
    expect([...flagsForOwner("MappingTime")].sort())
      .toEqual(["legendBinCount", "legendLogarithmic", "legendRange"])
  })

  it("returns an empty array for an unknown owner", () => {
    expect(flagsForOwner("NoSuchProject")).toEqual([])
  })
})
