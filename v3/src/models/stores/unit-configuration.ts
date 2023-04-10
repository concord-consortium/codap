import { ProblemConfiguration } from "./problem-configuration"

export interface UnitConfiguration extends ProblemConfiguration {
  // used in application loading message, log messages, etc.
  appName: string;
  // displayed in browser tab/window title
  pageTitle: string;
  // default title of personal documents
  defaultDocumentTitle: string;
  // enable/disable dragging of tiles
  disableTileDrags: boolean;
}
