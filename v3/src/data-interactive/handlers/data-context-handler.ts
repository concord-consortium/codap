import { appState } from "../../models/app-state"
import { gDataBroker } from "../../models/data/data-broker"
import { DataSet } from "../../models/data/data-set"
import {
  dataContextCountChangedNotification, dataContextDeletedNotification
} from "../../models/data/data-set-notifications"
import { getFormulaManager } from "../../models/tiles/tile-environment"
import { hasOwnProperty } from "../../utilities/js-utils"
import { t } from "../../utilities/translation/translate"
import { registerDIHandler } from "../data-interactive-handler"
import {
  DIDataContext, DIHandler, DINotifyDataContext, DIResources, DIUpdateDataContext, DIValues
} from "../data-interactive-types"
import { basicDataSetInfo, convertDataSetToV2 } from "../data-interactive-type-utils"
import { getAttribute } from "../data-interactive-utils"
import { findTileFromNameOrId } from "../resource-parser-utils"
import { createCollection } from "./di-handler-utils"
import { dataContextNotFoundResult, errorResult, fieldRequiredResult } from "./di-results"
import { toV3CaseId } from "../../utilities/codap-utils"

const requestRequiedResult = fieldRequiredResult("Notify", "dataContext", "request")

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
      const { caseMetadata } = gDataBroker.addDataSet(dataSet)
      getFormulaManager(document)?.addDataSet(dataSet)

      if (collections?.length) {
        // remove the default collection
        dataSet.removeCollection(dataSet.collections[0])

        // Create and add collections and attributes
        collections.forEach(v2collection => createCollection(v2collection, dataSet, caseMetadata))
      }

      return {
        success: true,
        values: basicDataSetInfo(dataSet)
      }
    }, {
      notify: dataContextCountChangedNotification
    })
  },

  delete(resources: DIResources) {
    const { dataContext } = resources
    if (!dataContext) return dataContextNotFoundResult

    appState.document.applyModelChange(() => {
      gDataBroker.removeDataSet(dataContext.id)
    }, {
      notify: [dataContextCountChangedNotification, dataContextDeletedNotification(dataContext)]
    })

    return { success: true }
  },

  get(resources: DIResources) {
    const { dataContext } = resources
    if (!dataContext) return dataContextNotFoundResult

    return { success: true, values: convertDataSetToV2(dataContext, appState.document.key) }
  },

  notify(resources: DIResources, values?: DIValues) {
    const { dataContext } = resources
    if (!dataContext) return dataContextNotFoundResult

    if (!values) return requestRequiedResult
    const { caseIDs, request } = values as DINotifyDataContext
    if (!request) return requestRequiedResult

    const successResult = { success: true as const, values: {} }
    if (request === "setAside") {
      if (!caseIDs) return fieldRequiredResult("Notify", "dataContext", "caseIDs")
      dataContext.hideCasesOrItems(caseIDs.map(caseId => toV3CaseId(caseId)))
      return successResult
    } else if (request === "restoreSetasides") {
      dataContext.showHiddenCasesAndItems()
      return successResult
    } else {
      return errorResult(t("V3.DI.Error.unknownRequest", { vars: [request] }))
    }
  },

  update(resources: DIResources, _values?: DIValues) {
    // TODO rerandomize
    // TODO sort
    const { dataContext } = resources
    if (!dataContext) return dataContextNotFoundResult

    const values = _values as DIUpdateDataContext
    if (values) {
      dataContext.applyModelChange(() => {
        const { managingController, metadata, sort, title } = values
        if (metadata && hasOwnProperty(metadata, "description")) dataContext.setDescription(metadata.description)
        if (hasOwnProperty(values, "title")) dataContext.setTitle(title)

        if (managingController) {
          const tile = findTileFromNameOrId(managingController)
          dataContext.setManagingControllerId(tile?.id)
        }

        if (sort?.attr) {
          const attribute = getAttribute(sort.attr, dataContext)
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
