import { diAdornmentHandler } from "./adornment-handler"

describe("DataInteractive AdornmentHandler", () => {
  const handler = diAdornmentHandler

  it("get returns an error when no adornment provided", () => {
    const result = handler.get?.({})
    expect(result?.success).toBe(false)
  })

})
