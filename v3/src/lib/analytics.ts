enum AnalyticsCategory {
  GENERAL = "general",  // catch-all for events that we haven't categorized yet
  DATA = "data",     // Interactions with generated data
  DOCUMENT = "document", // Document interactions
  PLUGIN = "plugin",     // Game interactions
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
  "Show all cases from parent toggles": AnalyticsCategory.DATA,
  "Hide all cases from parent toggles": AnalyticsCategory.DATA,
  "Create %@ cases in table": AnalyticsCategory.DATA,
  "Create attribute": AnalyticsCategory.DATA,
  "Edit cell value": AnalyticsCategory.DATA,
  "Delete attribute": AnalyticsCategory.DATA,
  "Edit attribute": AnalyticsCategory.DATA,
  "Delete all cases": AnalyticsCategory.DATA,

  "openDocument": AnalyticsCategory.DOCUMENT,
  "closeDocument": AnalyticsCategory.DOCUMENT,
  "autoSaveDocument": AnalyticsCategory.DOCUMENT,
  "saveDocument": AnalyticsCategory.DOCUMENT,
  "Imported data set": AnalyticsCategory.DOCUMENT,
  "Create New Empty DataSet": AnalyticsCategory.DOCUMENT,
  "Delete dataset": AnalyticsCategory.DOCUMENT,
  "Show web view": AnalyticsCategory.DOCUMENT,

  "Plugin initialized": AnalyticsCategory.PLUGIN,

  "LoadedModel": AnalyticsCategory.MODEL,
  "StartedModel": AnalyticsCategory.MODEL,

  "Create component": AnalyticsCategory.COMPONENT,
  "Title changed to %@": AnalyticsCategory.COMPONENT,
  "Close component": AnalyticsCategory.COMPONENT,
  "Close calculator": AnalyticsCategory.COMPONENT,

  "Added Plotted Value": AnalyticsCategory.PLOT,
  "Removed Plotted Value": AnalyticsCategory.PLOT,
  "Added Plotted Function": AnalyticsCategory.PLOT,
  "Removed Plotted Function": AnalyticsCategory.PLOT,
  "Added Mean": AnalyticsCategory.PLOT,
  "Removed Mean": AnalyticsCategory.PLOT,
  "Added Median": AnalyticsCategory.PLOT,
  "Removed Median": AnalyticsCategory.PLOT,
  "Rescale axes from data": AnalyticsCategory.PLOT,
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
