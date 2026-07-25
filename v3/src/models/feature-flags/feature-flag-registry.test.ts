import { isFeatureFlagName, kFeatureFlags } from "./feature-flag-registry"

const kLegendFlags = ["legendBinCount", "legendLogarithmic", "legendRange"] as const

describe("feature flag registry", () => {
  it("registers the MappingTime legend flags", () => {
    kLegendFlags.forEach(name => {
      expect(isFeatureFlagName(name)).toBe(true)
      expect(kFeatureFlags[name].owner).toBe("MappingTime")
    })
  })
})
