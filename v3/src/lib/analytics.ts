enum AnalyticsCategory {
  GENERAL = "general",  // catch-all for events that we haven't categorized yet
  DATA = "data",     // Interactions with generated data
  DOCUMENT = "document", // Document interactions
  GAME = "game",     // Game interactions
  MODEL = "model",    // Model interactions
  PLOT = "plot",     // Plot interactions
  SESSION = "session",  // Session events (log in/out)
  COMPONENT = "component", // General component interactions
  TABLE = "table",    // Table interactions
  SLIDER = "slider",    // Slider interactions
  TEXT = "text",     // Text interactions
}

export const eventCategoryMap: Record<string, AnalyticsCategory> = {
  "Show all cases": AnalyticsCategory.DATA,
  "Show all": AnalyticsCategory.DATA,
  "openCase": AnalyticsCategory.DATA,
  "Hide all": AnalyticsCategory.DATA,
  "deselectAll": AnalyticsCategory.DATA,
  "createCases": AnalyticsCategory.DATA,
  "createCase": AnalyticsCategory.DATA,
  "closeCase": AnalyticsCategory.DATA,
  "Create attribute": AnalyticsCategory.DATA,
  "Edit cell value": AnalyticsCategory.DATA,
  "Delete attribute": AnalyticsCategory.DATA,
  "Edit attribute": AnalyticsCategory.DATA,
  "Delete all cases": AnalyticsCategory.DATA,

  "openDocument": AnalyticsCategory.DOCUMENT,
  "closeDocument": AnalyticsCategory.DOCUMENT,
  "componentCreated": AnalyticsCategory.DOCUMENT,
  "closeComponent": AnalyticsCategory.DOCUMENT,
  "autoSaveDocument": AnalyticsCategory.DOCUMENT,
  "saveDocument": AnalyticsCategory.DOCUMENT,
  "Imported data set": AnalyticsCategory.DOCUMENT,
  "Close calculator": AnalyticsCategory.DOCUMENT,
  "Create New Empty DataSet": AnalyticsCategory.DOCUMENT,
  "Delete dataset": AnalyticsCategory.DOCUMENT,
  "Show web view": AnalyticsCategory.DOCUMENT,

  "initGame": AnalyticsCategory.GAME,
  "backToGame": AnalyticsCategory.GAME,

  "LoadedModel": AnalyticsCategory.MODEL,
  "StartedModel": AnalyticsCategory.MODEL,

  "Title changed to %@": AnalyticsCategory.COMPONENT,
  "Close %@": AnalyticsCategory.COMPONENT,
  "Close": AnalyticsCategory.COMPONENT,

  "togglePlottedMean": AnalyticsCategory.PLOT,
  "togglePlotFunction": AnalyticsCategory.PLOT,
  "rescaleScatterplot": AnalyticsCategory.PLOT,
  "rescaleDotPlot": AnalyticsCategory.PLOT,
  "plotFunction": AnalyticsCategory.PLOT,
  "plotAxisAttributeChangeType": AnalyticsCategory.PLOT,
  "plotAxisAttributeChange": AnalyticsCategory.PLOT,
  "legendAttributeChange": AnalyticsCategory.PLOT,
  "hoverOverGraphLine": AnalyticsCategory.PLOT,
  "ExportedModel": AnalyticsCategory.PLOT,
  "addAxisAttribute": AnalyticsCategory.PLOT,
  "attributeAssigned": AnalyticsCategory.PLOT,
  "attributeRemoved": AnalyticsCategory.PLOT,

  "Create collection": AnalyticsCategory.TABLE,
  "Toggle component": AnalyticsCategory.TABLE,

  "sliderThumbDragged": AnalyticsCategory.SLIDER,

  "Edited text component": AnalyticsCategory.TEXT,

  "Logout": AnalyticsCategory.SESSION,
  "Login": AnalyticsCategory.SESSION,
}

export const mockGA = {
  gtag: (event: string, eventName: string, data: Record<string, any>) => {
    console.group("Mock GA4 event payload:")
    console.debug("Event:", event)
    console.debug("Event Name:", eventName)
    console.debug("Data:", JSON.stringify(data, null, 2))
    console.groupEnd()
  }
}
