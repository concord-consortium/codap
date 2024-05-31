import { appState } from "../../models/app-state"
import { gDataBroker } from "../../models/data/data-broker"
import { DataSet } from "../../models/data/data-set"
import { getSharedCaseMetadataFromDataset } from "../../models/shared/shared-data-utils"
import { hasOwnProperty } from "../../utilities/js-utils"
import { registerDIHandler } from "../data-interactive-handler"
import {
  DIDataContext, DIHandler, DIResources, DIUpdateDataContext, DIValues, diNotImplementedYet
} from "../data-interactive-types"
import { basicDataSetInfo, convertDataSetToV2 } from "../data-interactive-type-utils"
import { getAttribute } from "../data-interactive-utils"
import { createCollection } from "./di-handler-utils"
import { dataContextNotFoundResult } from "./di-results"

export const diDataContextHandler: DIHandler = {
  create(_resources: DIResources, _values?: DIValues) {
    const values = _values as DIDataContext
    const { collections, description, name: _name, title } = values
    const name = _name || gDataBroker.newDataSetName
    const document = appState.document

    // Return the existing dataset if the name is already being used
    const sameName = gDataBroker.getDataSetByName(name)
    if (sameName) return { success: true, values: basicDataSetInfo(sameName) }

    return document.applyModelChange(() => {
      // Create dataset
      const dataSet = DataSet.create({ description, name, _title: title })
      gDataBroker.addDataSet(dataSet)
      const metadata = getSharedCaseMetadataFromDataset(dataSet)

      // Create and add collections and attributes
      collections?.forEach(v2collection => createCollection(v2collection, dataSet, metadata))

      return {
        success: true,
        values: basicDataSetInfo(dataSet)
      }
    })
  },

  delete(resources: DIResources) {
    const { dataContext } = resources
    if (!dataContext) return dataContextNotFoundResult

    dataContext.applyModelChange(() => {
      gDataBroker.removeDataSet(dataContext.id)
    })

    return { success: true }
  },

  get(resources: DIResources) {
    const { dataContext } = resources
    if (!dataContext) return dataContextNotFoundResult

    return { success: true, values: convertDataSetToV2(dataContext, appState.document.key) }
  },

  // TODO setAside and restoreSetasides [sic]
  notify: diNotImplementedYet,

  update(resources: DIResources, _values?: DIValues) {
    // TODO rerandomize
    // TODO sort
    const { dataContext } = resources
    if (!dataContext) return dataContextNotFoundResult

    const values = _values as DIUpdateDataContext
    if (values) {
      dataContext.applyModelChange(() => {
        const { metadata, title } = values
        if (metadata && hasOwnProperty(metadata, "description")) dataContext.setDescription(metadata.description)
        if (hasOwnProperty(values, "title")) dataContext.setTitle(title)

        if (values.sort?.attr) {
          const attribute = getAttribute(values.sort.attr, dataContext)
          if (attribute) {
            // TODO Perform the actual sort
          }
        }
      })
    }

    return { success: true }
  }
}

registerDIHandler("dataContext", diDataContextHandler)
