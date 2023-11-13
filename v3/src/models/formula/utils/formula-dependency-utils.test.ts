import { basicCanonicalNameToDependency } from "./formula-dependency-utils"
import { CANONICAL_NAME, GLOBAL_VALUE, LOCAL_ATTR } from "./name-mapping-utils"

describe("basicCanonicalNameToDependency", () => {
  it("returns undefined if the name is not a canonical name", () => {
    const name = "FOO_BAR"
    const result = basicCanonicalNameToDependency(name)
    expect(result).toBeUndefined()
  })
  it("returns a local attribute dependency if the name starts with the local attribute prefix", () => {
    const name = `${CANONICAL_NAME}${LOCAL_ATTR}foo`
    const result = basicCanonicalNameToDependency(name)
    expect(result).toEqual({ type: "localAttribute", attrId: "foo" })
  })
  it("returns a global value dependency if the name starts with the global value prefix", () => {
    const name = `${CANONICAL_NAME}${GLOBAL_VALUE}bar`
    const result = basicCanonicalNameToDependency(name)
    expect(result).toEqual({ type: "globalValue", globalId: "bar" })
  })
})
