import { getSelfReferenceDirection } from "./formula-dependency-utils"
import { localAttrIdToCanonical } from "./name-mapping-utils"

describe("getSelfReferenceDirection", () => {
  const selfId = "self_attr_id"
  const otherId = "other_attr_id"
  const self = localAttrIdToCanonical(selfId)
  const other = localAttrIdToCanonical(otherId)

  it("returns 'none' when the formula has no prev/next self-references", () => {
    expect(getSelfReferenceDirection(`${other} + 1`, selfId)).toBe("none")
    expect(getSelfReferenceDirection(`prev(${other}, 0)`, selfId)).toBe("none")
    expect(getSelfReferenceDirection(`next(${other}, 0)`, selfId)).toBe("none")
  })

  it("returns 'forward' for pure prev(self)", () => {
    expect(getSelfReferenceDirection(`prev(${self}, 0) + 1`, selfId)).toBe("forward")
    expect(getSelfReferenceDirection(`${other} + prev(${self}, 0)`, selfId)).toBe("forward")
    // Nested prev(prev(self)) still counts as forward-only
    expect(getSelfReferenceDirection(`prev(prev(${self}, 0), 0)`, selfId)).toBe("forward")
  })

  it("returns 'reverse' for pure next(self)", () => {
    expect(getSelfReferenceDirection(`next(${self}, 0) + 1`, selfId)).toBe("reverse")
    expect(getSelfReferenceDirection(`${other} + next(${self}, 0)`, selfId)).toBe("reverse")
  })

  it("returns 'mixed' when both prev(self) and next(self) appear", () => {
    expect(getSelfReferenceDirection(`prev(${self}, 0) + next(${self}, 0)`, selfId)).toBe("mixed")
    // Even when the prev/next-of-self is nested - the subtree walk picks up the self reference
    expect(getSelfReferenceDirection(`prev(next(${self}, 0), 0)`, selfId)).toBe("mixed")
  })

  it("ignores self-references in defaultValue arg (which is current-case, not row-shifted)", () => {
    // The selfReferenceAllowed propagation only marks aggregate args in isSemiAggregate (true at
    // index 0 expression and index 2 filter). Index 1 defaultValue is current-case context, so
    // a self-ref there would be caught as a real cycle by the static detector, not iterated.
    expect(getSelfReferenceDirection(`prev(${other}, ${self})`, selfId)).toBe("none")
    expect(getSelfReferenceDirection(`next(${other}, ${self})`, selfId)).toBe("none")
  })

  it("returns 'none' when arguments are missing or attributeId is empty", () => {
    expect(getSelfReferenceDirection("", selfId)).toBe("none")
    expect(getSelfReferenceDirection(`prev(${self}, 0)`, "")).toBe("none")
  })
})
