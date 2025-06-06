/* global ga */
(function () {

DG.Analytics = {};

DG.Analytics.Category = {
  GENERAL:  "General",  // catch-all for events that we haven't categorized yet
  DATA:     "Data",     // Interactions with generated data
  DOCUMENT: "Document", // Document interactions
  GAME:     "Game",     // Game interactions
  MODEL:    "Model",    // Model interactions
  PLOT:     "Plot",     // Plot interactions
  SESSION:  "Session",  // Session events (log in/out)
};

var _timeStart = {};

// These were hand-pulled from existing log data, so inevitably there were some missed.
// Really, we should be more explicit about event types, categories, and whatnot
// at the point that we initiate the logging, rather than trying to map them like this.
DG.Analytics.categoryForEvent = function(event) {
  switch (event) {
    case "Show all cases":
    case "Show all":
    case "openCase":
    case "Hide all":
    case "deselectAll":
    case "createCases":
    case "createCase":
    case "closeCase":
    case "attributeRemoved":
    case "attributeCreate":
      return DG.Analytics.Category.DATA;
    case "openDocument":
    case "closeDocument":
    case "componentCreated":
    case "closeComponent":
    case "autoSaveDocument":
    case "saveDocument":
      return DG.Analytics.Category.DOCUMENT;
    case "initGame":
    case "backToGame":
      return DG.Analytics.Category.GAME;
    case "LoadedModel":
    case "StartedModel":
      return DG.Analytics.Category.MODEL;
    case "togglePlottedMean":
    case "togglePlotFunction":
    case "rescaleScatterplot":
    case "rescaleDotPlot":
    case "plotFunction":
    case "plotAxisAttributeChangeType":
    case "plotAxisAttributeChange":
    case "legendAttributeChange":
    case "hoverOverGraphLine":
    case "ExportedModel":
    case "addAxisAttribute":
      return DG.Analytics.Category.PLOT;
    case "Logout":
    case "Login":
      return DG.Analytics.Category.SESSION;
    default:
      if (event && event.search(/Hide .* selected cases/) !== -1) {
        return DG.Analytics.Category.DATA;
      }
      return DG.Analytics.Category.GENERAL;
  }
};

DG.Analytics._analyticsEnabled = function() {
  return typeof(ga) !== "undefined" && ga !== null;
};

DG.Analytics.trackEvent = function(category, action, label, value) {
  if (!this._analyticsEnabled()) return;

  var evt = ['send', 'event', category, action];
  if (label) {
    evt.push(label);
    if (value) {
      evt.push(value);
    }
  }
  ga.apply(window, evt);
};

DG.Analytics.trackTimingStart = function(category) {
  if (!this._analyticsEnabled()) return;

  _timeStart[category] = new Date().getTime();
};

DG.Analytics.trackTimingEnd = function(category) {
  if (!this._analyticsEnabled() || !_timeStart[category]) return;

  var timeSpent = new Date().getTime() - _timeStart[category];
  _timeStart[category] = null;

  // sanity-check: time spend should be positive, and less than two hours
  if (timeSpent > 0 && timeSpent < (1000 * 60 * 120)) {
    var evt = ['send', 'timing', category, 'Time spent', timeSpent];
    ga.apply(window, evt);
  }
};

}());
