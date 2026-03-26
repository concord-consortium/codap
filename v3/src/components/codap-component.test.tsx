import { render, screen } from "@testing-library/react"
import { ITileLikeModel } from "../models/tiles/tile-content-info"
import { TileModel } from "../models/tiles/tile-model"
import { CodapComponent } from "./codap-component"

// Mock getTitle to return a known value
const mockGetTitle = jest.fn()
jest.mock("../models/tiles/tile-content-info", () => ({
  ...jest.requireActual("../models/tiles/tile-content-info"),
  getTitle: (tile: ITileLikeModel) => mockGetTitle(tile)
}))

// Provide minimal tile component info so CodapComponent renders
const MockComponent = () => <div data-testid="mock-component">content</div>
const MockTitleBar = () => <div data-testid="mock-title-bar">title bar</div>

jest.mock("../models/tiles/tile-component-info", () => ({
  ...jest.requireActual("../models/tiles/tile-component-info"),
  getTileComponentInfo: () => ({
    TitleBar: MockTitleBar,
    Component: MockComponent,
    tileEltClass: "mock-tile"
  })
}))

describe("CodapComponent", () => {

  beforeEach(() => {
    mockGetTitle.mockReturnValue("Test Title")
  })

  it("uses aria-labelledby when the title bar exists", () => {
    const tile = TileModel.create({ _title: "Test Title", content: {} as any })
    render(<CodapComponent tile={tile} onCloseTile={jest.fn()} />)

    const container = screen.getByTestId("mock-tile")
    expect(container).toHaveAttribute("aria-labelledby", `tile-title-${tile.id}`)
    expect(container).not.toHaveAttribute("aria-label")
  })

  it("uses aria-label when the title bar does not exist", () => {
    const tile = TileModel.create({ _title: "Test Title", content: {} as any })
    render(<CodapComponent tile={tile} hideTitleBar onCloseTile={jest.fn()} />)

    const container = screen.getByTestId("mock-tile")
    expect(container).toHaveAttribute("aria-label", "Test Title")
    expect(container).not.toHaveAttribute("aria-labelledby")
  })
})
