import { featureTourConfig } from "./feature-tour-config"

describe("featureTourConfig", () => {
  it("has 21 steps", () => {
    expect(featureTourConfig.steps).toHaveLength(21)
  })

  it("each step has a non-empty element selector", () => {
    featureTourConfig.steps.forEach((tourStep) => {
      expect(tourStep.element).toBeTruthy()
      expect(typeof tourStep.element).toBe("string")
      expect((tourStep.element as string).length).toBeGreaterThan(0)
    })
  })

  it("each step has a popover with description", () => {
    featureTourConfig.steps.forEach((tourStep) => {
      expect(tourStep.popover).toBeDefined()
      const popover = tourStep.popover as { description?: string }
      expect(popover.description).toBeTruthy()
      expect(typeof popover.description).toBe("string")
    })
  })

  it("each step has a popover with title", () => {
    featureTourConfig.steps.forEach((tourStep) => {
      const popover = tourStep.popover as { title?: string }
      expect(popover.title).toBeTruthy()
    })
  })

  it("uses default tour options", () => {
    expect(featureTourConfig.options?.showProgress).toBe(true)
    expect(featureTourConfig.options?.doneBtnText).toBe("Got it!")
    expect(featureTourConfig.options?.allowClose).toBe(true)
    expect(featureTourConfig.options?.allowKeyboardControl).toBe(true)
  })
})
