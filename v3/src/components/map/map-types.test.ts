import { BaseMapKeys, kMapAttributions } from "./map-types"

describe("map attributions", () => {
  it("has a non-empty attribution for every base map layer", () => {
    BaseMapKeys.forEach(key => {
      expect(kMapAttributions[key]).toBeTruthy()
    })
  })
})
