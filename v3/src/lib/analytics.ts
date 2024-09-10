export const AnalyticsCategories = [
  "general",    // catch-all for events that we haven't categorized yet
  "data",       // Interactions with generated data
  "document",   // Document interactions
  "plugin",     // Game interactions
  "model",      // Model interactions
  "plot",       // Plot interactions
  "session",    // Session events (log in/out)
  "component",  // General component interactions
  "table",      // Table interactions
  "slider",     // Slider interactions
  "text",       // Text interactions
  "calculator", // Calculator interactions (correcting typo)
  "map",        // Map interactions
  "webview",    // Webview interactions
] as const

export type AnalyticsCategory = typeof AnalyticsCategories[number]

export const mockGA = {
  gtag: (event: string, eventName: string, data: Record<string, any>) => {
    console.group("Mock GA4 event payload:")
    console.debug("Event:", event)
    console.debug("Event Name:", eventName)
    console.debug("Data:", JSON.stringify(data, null, 2))
    console.groupEnd()
  }
}
