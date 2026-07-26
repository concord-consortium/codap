import {
  flagsForOwner, isFeatureFlagName, isFeatureFlagOwner, kFeatureFlagNames, kFeatureFlags
} from "./feature-flag-registry"

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

  /*
   * A url token is matched as a flag name before an owner name, so a name that is
   * both would silently never expand to its group. Nothing in the type system
   * enforces the two namespaces staying disjoint, so assert the convention here.
   */
  it("keeps flag names and owner names disjoint", () => {
    kFeatureFlagNames.forEach(name => expect(isFeatureFlagOwner(name)).toBe(false))
  })
})
