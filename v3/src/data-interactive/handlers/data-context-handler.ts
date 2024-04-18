import { appState } from "../../models/app-state"
import { gDataBroker } from "../../models/data/data-broker"
import { DataSet } from "../../models/data/data-set"
import { getSharedCaseMetadataFromDataset } from "../../models/shared/shared-data-utils"
import { t } from "../../utilities/translation/translate"
import { registerDIHandler } from "../data-interactive-handler"
import { DIDataContext, DIHandler, DIResources, DIValues } from "../data-interactive-types"
import { basicDataSetInfo, convertDataSetToV2 } from "../data-interactive-type-utils"
import { createCollection } from "./di-handler-utils"

const contextNotFoundResult = { success: false, values: { error: t("V3.DI.Error.dataContextNotFound") } } as const

export const diDataContextHandler: DIHandler = {
  create(_resources: DIResources, _values?: DIValues) {
    const values = _values as DIDataContext
    const { collections, description, name: _name, title } = values
    const name = _name || gDataBroker.newDataSetName
    const document = appState.document

    // Return the existing dataset if the name is already being used
    const sameName = gDataBroker.getDataSetByName(name)
    if (sameName) return { success: true, values: basicDataSetInfo(sameName) }

    return document.applyUndoableAction(() => {
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
    if (!dataContext) return contextNotFoundResult

    dataContext.applyUndoableAction(() => {
      gDataBroker.removeDataSet(dataContext.id)
    })

    return { success: true }
  },

  get(resources: DIResources) {
    const { dataContext } = resources
    if (!dataContext) return contextNotFoundResult

    return { success: true, values: convertDataSetToV2(dataContext) }
  },

  update(resources: DIResources, _values?: DIValues) {
    const { dataContext } = resources
    if (!dataContext) return contextNotFoundResult

    const values = _values as DIDataContext
    if (values) {
      dataContext.applyUndoableAction(() => {
        const { metadata, title } = values
        const description = metadata?.description
        if (description) dataContext.setDescription(description)
        if (title) dataContext.setTitle(title)
      })
    }

    return { success: true }
  }
}

registerDIHandler("dataContext", diDataContextHandler)
