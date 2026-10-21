/**
 * Helper that wraps a test in a "subscribe broad monitor → run test → unsubscribe →
 * assert no DOM divergence from baseline" flow. Used by the regression-parity suite
 * to verify non-consumption (CODAP's own event handling is unaffected by the observer).
 *
 * A "broad monitor" subscribes to every event type with no target filter — the
 * maximum-pressure configuration for parity testing.
 */

export const BROAD_MONITOR_FILTER = {
  eventTypes: [
    "appear", "disappear", "click", "dblclick", "dragStart", "dragEnd", "layoutChange", "dialogChange"
  ]
} as const

export function withBroadMonitor(runTest: () => void) {
  // Record a baseline signature of the DOM before subscribing
  let baselineSignature: string = ""
  cy.document().then(doc => {
    baselineSignature = signatureOfMainDOM(doc)
  })

  cy.window().then((win: any) => {
    expect(win.subscribeMonitor, "test-plugin subscribeMonitor").to.be.a("function")
    return win.subscribeMonitor(BROAD_MONITOR_FILTER)
  })

  runTest()

  cy.window().then((win: any) => {
    return win.unsubscribeMonitor && win.__lastMonitorId != null
      ? win.unsubscribeMonitor(win.__lastMonitorId)
      : undefined
  })

  cy.document().then(doc => {
    const post = signatureOfMainDOM(doc)
    expect(post).to.equal(baselineSignature)
  })
}

function signatureOfMainDOM(doc: Document): string {
  const app = doc.querySelector("#codap-app")
  if (!app) return ""
  // Cheap signature: count of each tagName + number of free-tile-components
  const counts: Record<string, number> = {}
  app.querySelectorAll("*").forEach(el => {
    counts[el.tagName] = (counts[el.tagName] || 0) + 1
  })
  return JSON.stringify(counts)
}
