/**
 * Helper that wraps a test in a "subscribe broad monitor → run test → unsubscribe →
 * assert no DOM divergence from baseline" flow. Used by the regression-parity suite
 * to verify non-consumption (CODAP's own event handling is unaffected by the observer).
 *
 * A "broad monitor" subscribes to every event type with no target filter — the
 * maximum-pressure configuration for parity testing.
 */

import { testPluginWindow } from "./helpers/test-plugin"

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

  let monitorId: number | undefined
  testPluginWindow().then(async (win: any) => {
    const reply = await win.subscribeMonitor(BROAD_MONITOR_FILTER)
    expect(reply?.success, "subscribeMonitor succeeded").to.equal(true)
    monitorId = reply.values.id
  })

  runTest()

  testPluginWindow().then(async (win: any) => {
    const reply = await win.unsubscribeMonitor(monitorId)
    expect(reply?.success, "unsubscribeMonitor succeeded").to.equal(true)
  })

  // Retried, so a menu still animating closed has time to unmount.
  cy.document().should(doc => {
    expect(signatureOfMainDOM(doc), "app DOM signature").to.equal(baselineSignature)
  })
}

function signatureOfMainDOM(doc: Document): string {
  const app = doc.querySelector('[data-testid="codap-app"]')
  expect(app, "CODAP app root").to.not.equal(null)
  if (!app) return ""
  // Counts of each element kind under the app root, a kind being its tag with its
  // aria-expanded and aria-hidden values, so a control left open or hidden shows up.
  const counts: Record<string, number> = {}
  app.querySelectorAll("*").forEach(el => {
    const kind = [el.tagName, el.getAttribute("aria-expanded"), el.getAttribute("aria-hidden")].join("|")
    counts[kind] = (counts[kind] || 0) + 1
  })
  return JSON.stringify(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)))
}
