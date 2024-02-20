import { getSnapshot } from "mobx-state-tree"
import { DIHandler, DIResources, diNotImplementedYet } from "./data-interactive-types"

// TODO: Currently a combination of attribute handler and hard coded interactive frame
// code from handler hook

export const diInteractiveFrameHandler: DIHandler = {
  get(resources: DIResources) {
    const { attribute } = resources
    return attribute
      ? {
          success: true,
          // TODO: convert to v2 format for plugins
          values: getSnapshot(attribute)
        }
      : {success: false, values: {error: 'Attribute not found'}}
  },
  create: diNotImplementedYet,
  update: diNotImplementedYet,
  delete: diNotImplementedYet
}

if (action && action.resource === "interactiveFrame") {
  if (action.action === "update") {
    const values = action.values
    if (values.title) {
      tile?.setTitle(values.title)
      return { success: true }
    }
  } else if (action.action === "get") {
    return {
      success: true,
      values: {
        name: tile?.title,
        title: tile?.title,
        version: "0.1",
        preventBringToFront: false,
        preventDataContextReorg: false,
        dimensions: {
          width: 600,
          height: 500
        },
        externalUndoAvailable: true,
        standaloneUndoModeAvailable: false
      }
    }
  }
}