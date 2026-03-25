import { ITourConfig } from "./tour-types"

const mockDrive = jest.fn()
const mockDriver = jest.fn((_config: any) => ({ drive: mockDrive }))

jest.mock("driver.js", () => ({
  driver: (config: unknown) => mockDriver(config)
}))
jest.mock("driver.js/dist/driver.css", () => ({}))
jest.mock("./tour-styles.scss", () => ({}))

// Import after mocks are set up
import { runTour } from "./tour-runner"

function getDriverCallArg() {
  return (mockDriver.mock.calls as any[][])[0][0]
}

describe("runTour", () => {
  beforeEach(() => {
    mockDriver.mockClear()
    mockDrive.mockClear()
  })

  it("launches a tour with active steps", () => {
    const config: ITourConfig = {
      options: { showProgress: true },
      steps: [
        { element: "body", popover: { description: "Test step" } }
      ]
    }
    runTour(config)
    expect(mockDriver).toHaveBeenCalledTimes(1)
    expect(mockDrive).toHaveBeenCalledTimes(1)
    expect(getDriverCallArg().steps).toHaveLength(1)
  })

  it("filters out steps with skip: true", () => {
    const config: ITourConfig = {
      steps: [
        { element: "body", popover: { description: "Visible" } },
        { element: "body", popover: { description: "Skipped" }, skip: true },
        { element: "body", popover: { description: "Also visible" } }
      ]
    }
    runTour(config)
    const arg = getDriverCallArg()
    expect(arg.steps).toHaveLength(2)
    expect(arg.steps[0].popover.description).toBe("Visible")
    expect(arg.steps[1].popover.description).toBe("Also visible")
  })

  it("filters out steps whose selector matches no DOM element", () => {
    const config: ITourConfig = {
      steps: [
        { element: "body", popover: { description: "Exists" } },
        { element: ".nonexistent-element", popover: { description: "Missing" } }
      ]
    }
    runTour(config)
    const arg = getDriverCallArg()
    expect(arg.steps).toHaveLength(1)
    expect(arg.steps[0].popover.description).toBe("Exists")
  })

  it("does not launch tour when all steps are filtered out", () => {
    const config: ITourConfig = {
      steps: [
        { element: ".nonexistent", popover: { description: "Missing" } },
        { element: "body", popover: { description: "Skipped" }, skip: true }
      ]
    }
    runTour(config)
    expect(mockDriver).not.toHaveBeenCalled()
    expect(mockDrive).not.toHaveBeenCalled()
  })

  it("passes options through to driver", () => {
    const config: ITourConfig = {
      options: {
        showProgress: true,
        doneBtnText: "Got it!",
        popoverClass: "codap-tour-popover"
      },
      steps: [
        { element: "body", popover: { description: "Test" } }
      ]
    }
    runTour(config)
    const arg = getDriverCallArg()
    expect(arg.showProgress).toBe(true)
    expect(arg.doneBtnText).toBe("Got it!")
    expect(arg.popoverClass).toBe("codap-tour-popover")
  })
})
