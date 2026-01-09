import { isInquirySpaceMode } from "../../../utilities/url-params"
import { GraphContentModel } from "./graph-content-model"

jest.mock("../../../utilities/url-params", () => {
  const originalModule = jest.requireActual("../../../utilities/url-params")
  return {
    __esModule: true,
    ...originalModule,
    isInquirySpaceMode: jest.fn(),
  }
})

describe("GraphContentModel", () => {
  it("should auto-enable parent toggles in Inquiry Space mode", () => {
    (isInquirySpaceMode as jest.Mock).mockReturnValue(false)
    const graphModel1 = GraphContentModel.create({})
    expect(graphModel1.showParentToggles).toBe(false)
    ;(isInquirySpaceMode as jest.Mock).mockReturnValue(true)
    const graphModel2 = GraphContentModel.create({})
    expect(graphModel2.showParentToggles).toBe(true)
  })
})
