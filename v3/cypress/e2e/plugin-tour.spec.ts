import { TourPopoverElements as tour } from "../support/elements/tour-popover"
import { testPluginWindow, visitWithTestPlugin } from "../support/helpers/test-plugin"

function tourRequest(values: Record<string, unknown>) {
  return testPluginWindow().then(async (w: any) => {
    const reply = await w.codapRequest({ action: "notify", resource: "interactiveFrame", values })
    expect(reply?.success, `${values.request} succeeded`).to.equal(true)
  })
}

const twoStepTour = {
  request: "startTour",
  steps: [{ tourKey: "toolShelf.table", id: "table" }, { tourKey: "toolShelf.graph", id: "graph" }]
}

/** Retries until the plugin has received exactly these notice types, in order. */
function expectTourNotices(types: string[]) {
  return testPluginWindow().should((w: any) => {
    expect(w.getTourNotices().map((n: any) => n.type)).to.deep.equal(types)
  })
}

function tourNotices(): Cypress.Chainable<any[]> {
  return testPluginWindow().then((w: any) => w.getTourNotices())
}

describe("Plugin tours", () => {
  beforeEach(() => {
    visitWithTestPlugin()
    testPluginWindow().then((w: any) => w.resetTourNotices())
  })

  it("shows the first step in CODAP's look and tells the plugin it started", () => {
    tourRequest(twoStepTour)
    tour.getTitle().should("have.text", "Tables")
    tour.getProgress().should("have.text", "1 of 2")
    expectTourNotices(["stepStarted"])
    tourNotices().then(notes => expect(notes[0].stepIndex).to.equal(0))
    cy.get('[data-testid="coachmarks-outline-ring"]').should("have.css", "border-top-color", "rgb(1, 135, 158)")
  })

  it("runs to completion with Next and Got it!", () => {
    tourRequest(twoStepTour)
    expectTourNotices(["stepStarted"])
    tour.getNextButton().should("have.text", "Next").click()
    tour.getTitle().should("have.text", "Graph")
    tour.getNextButton().should("have.text", "Got it!").click()
    tour.getPopover().should("not.exist")
    expectTourNotices(["stepStarted", "stepEnded", "stepStarted", "stepEnded", "completed"])
    tourNotices().then(notes => {
      expect(notes.map(n => n.stepIndex)).to.deep.equal([0, 0, 1, 1, undefined])
    })
  })

  it("moves with the arrow keys and Previous, and leaves modified arrows alone", () => {
    tourRequest(twoStepTour)
    expectTourNotices(["stepStarted"])
    // If Alt+ArrowRight moved, the plain ArrowRight would finish the two-step tour.
    cy.get("body").type("{alt}{rightarrow}")
    cy.get("body").type("{rightarrow}")
    tour.getTitle().should("have.text", "Graph")
    cy.get("body").type("{leftarrow}")
    tour.getTitle().should("have.text", "Tables")
    tour.getNextButton().click()
    tour.getTitle().should("have.text", "Graph")
    expectTourNotices(["stepStarted", "stepEnded", "stepStarted", "stepEnded", "stepStarted", "stepEnded",
      "stepStarted"])
    testPluginWindow().then((w: any) => w.resetTourNotices())
    tour.getPrevButton().click()
    tour.getTitle().should("have.text", "Tables")
    expectTourNotices(["stepEnded", "stepStarted"])
    tourNotices().then(notes => expect(notes.map(n => n.stepIndex)).to.deep.equal([1, 0]))
  })

  it("sends only cancelled when Escape ends the tour", () => {
    tourRequest(twoStepTour)
    expectTourNotices(["stepStarted"])
    cy.get("body").type("{esc}")
    tour.getPopover().should("not.exist")
    expectTourNotices(["stepStarted", "cancelled"])
    tourNotices().then(notes => expect(notes[1].stepIndex).to.equal(0))
  })

  it("sends only cancelled when the close button ends the tour", () => {
    tourRequest(twoStepTour)
    expectTourNotices(["stepStarted"])
    tour.getCloseButton().click()
    tour.getPopover().should("not.exist")
    expectTourNotices(["stepStarted", "cancelled"])
    tourNotices().then(notes => expect(notes[1].stepIndex).to.equal(0))
  })

  it("highlights an element until Done", () => {
    tourRequest({ request: "highlight", tourKey: "toolShelf.graph", id: "h", popover: { title: "Look here" } })
    tour.getTitle().should("have.text", "Look here")
    expectTourNotices(["highlighted"])
    tour.getNextButton().should("have.text", "Done").click()
    tour.getPopover().should("not.exist")
    expectTourNotices(["highlighted", "highlightCleared"])
  })

  it("skips steps whose target is hidden or missing", () => {
    cy.document().then(doc => {
      const hidden = doc.createElement("div")
      hidden.setAttribute("data-testid", "hidden-tour-target")
      hidden.style.display = "none"
      doc.body.appendChild(hidden)
    })
    tourRequest({
      request: "startTour",
      steps: [
        { tourKey: "toolShelf.table" },
        { testId: "hidden-tour-target" },
        { testId: "no-such-tour-target" },
        { tourKey: "toolShelf.graph" }
      ]
    })
    expectTourNotices(["stepStarted"])
    tourNotices().then(notes => {
      expect(notes[0].totalSteps).to.equal(4)
      expect(notes[0].visibleSteps).to.equal(2)
    })
    tour.getNextButton().click()
    tour.getNextButton().click()
    expectTourNotices(["stepStarted", "stepEnded", "stepStarted", "stepEnded", "completed"])
    tourNotices().then(notes => expect(notes[2].stepIndex).to.equal(3))
  })

  it("shows descriptions as plain text", () => {
    tourRequest({ request: "highlight", tourKey: "toolShelf.graph", popover: { description: "*x* [a](b)" } })
    tour.getDescription().should("have.text", "*x* [a](b)")
  })

  it("does not report the popover as a UI notification", () => {
    testPluginWindow().then(async (w: any) => {
      const reply = await w.subscribeMonitor({ eventTypes: ["appear", "disappear"] })
      expect(reply?.success).to.equal(true)
      w.resetDeliveredNotices()
    })
    tourRequest(twoStepTour)
    tour.getPopover().should("be.visible")
    tourRequest({ request: "endTour" })
    tour.getPopover().should("not.exist")
    expectTourNotices(["stepStarted", "cancelled"])
    testPluginWindow().then((w: any) => {
      const popoverNotices = w.getDeliveredNotices().filter((n: any) => n.target?.testId?.startsWith("coachmarks-"))
      expect(popoverNotices).to.have.length(0)
    })
  })
})
