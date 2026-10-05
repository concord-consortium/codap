import { kPrivateValueJson, privateValue } from "./private-value"

describe("privateValue", () => {
  it("keeps the wrapped value", () => {
    expect(privateValue("Student's file").value).toBe("Student's file")
  })

  it("hides the wrapped value when converted to JSON", () => {
    expect(JSON.stringify(privateValue("Student's file"))).toBe(`"${kPrivateValueJson}"`)
    expect(JSON.stringify({ name: privateValue("Student's file") })).toBe(`{"name":"${kPrivateValueJson}"}`)
  })
})
