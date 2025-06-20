import { IDataSet as IFormulaDataSet } from "@concord-consortium/codap-formulas/models/data/data-set"
import { appState } from "../../models/app-state"
import { gDataBroker } from "../../models/data/data-broker"
import { DataSet } from "../../models/data/data-set"
import {
  dataContextCountChangedNotification, dataContextDeletedNotification
} from "../../models/data/data-set-notifications"
import { sortItemsWithCustomUndoRedo } from "../../models/data/data-set-undo"
import { addSetAsideCases, replaceSetAsideCases, restoreSetAsideCases } from "../../models/data/data-set-utils"
import { getMetadataFromDataSet } from "../../models/shared/shared-data-utils"
import { getFormulaManager } from "../../models/tiles/tile-environment"
import { toV3CaseId } from "../../utilities/codap-utils"
import { hasOwnProperty } from "../../utilities/js-utils"
import { t } from "../../utilities/translation/translate"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources, DIValues } from "../data-interactive-types"
import { DIUpdateDataContext, DIDataContext, DINotifyDataContext } from "../data-interactive-data-set-types"
import { basicDataSetInfo, convertDataSetToV2 } from "../data-interactive-type-utils"
import { getAttribute } from "../data-interactive-utils"
import { findTileFromNameOrId } from "../resource-parser-utils"
import { createCollection } from "./di-handler-utils"
import { attributeNotFoundResult, dataContextNotFoundResult, errorResult, fieldRequiredResult } from "./di-results"

const requestRequiredResult = fieldRequiredResult("Notify", "dataContext", "request")

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
      const dataSet = DataSet.create({ name, _title: title })
      const { sharedMetadata } = gDataBroker.addDataSet(dataSet)
      sharedMetadata.setDescription(description)
      getFormulaManager(document)?.addDataSet(dataSet as IFormulaDataSet)

      if (collections?.length) {
        // remove the default collection
        dataSet.removeCollection(dataSet.collections[0])

        // Create and add collections and attributes
        collections.forEach(v2collection => createCollection(v2collection, dataSet, sharedMetadata))
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

    return { success: true, values: convertDataSetToV2(dataContext) }
  },

  notify(resources: DIResources, values?: DIValues) {
    const { dataContext } = resources
    if (!dataContext) return dataContextNotFoundResult

    if (!values) return requestRequiredResult
    const { caseIDs, operation, request } = values as DINotifyDataContext
    if (!request) return requestRequiredResult

    const successResult = { success: true as const, values: {} }
    if (request === "setAside") {
      if (operation === "restore") {
        const v3CaseIDs = caseIDs?.map(caseID => toV3CaseId(caseID))
        restoreSetAsideCases(dataContext, v3CaseIDs, false)
        return successResult

      } else {
        if (!caseIDs) return fieldRequiredResult("Notify", "dataContext", "caseIDs")
        const v3CaseIds = caseIDs.map(caseId => toV3CaseId(caseId))

        if (operation === "replace") {
          replaceSetAsideCases(dataContext, v3CaseIds)
        } else {
          addSetAsideCases(dataContext, v3CaseIds, false)
        }

        return successResult
      }

    } else if (request.toLowerCase() === "restoresetasides") {
      restoreSetAsideCases(dataContext, undefined, false)
      return successResult

    } else {
      return errorResult(t("V3.DI.Error.unknownRequest", { vars: [request] }))
    }
  },

  update(resources: DIResources, _values?: DIValues) {
    // TODO rerandomize
    const { dataContext } = resources
    if (!dataContext) return dataContextNotFoundResult

    const v3Metadata = getMetadataFromDataSet(dataContext)

    const values = _values as DIUpdateDataContext
    if (values) {
      const { managingController, metadata, sort, title } = values
      dataContext.applyModelChange(() => {
        if (metadata && hasOwnProperty(metadata, "description")) {
          v3Metadata?.setDescription(metadata.description)
        }
        if (hasOwnProperty(values, "title")) dataContext.setTitle(title)

        if (managingController) {
          const tile = findTileFromNameOrId(managingController)
          dataContext.setManagingControllerId(tile?.id)
        }
      })

      if (sort != null) {
        const { attr, isDescending } = sort
        if (!attr) return fieldRequiredResult("update sort", "dataContext", "attr")

        const attribute = getAttribute(`${attr}`, dataContext)
        if (!attribute) return attributeNotFoundResult

        dataContext.applyModelChange(() => {
          const direction = isDescending ? "descending" : "ascending"
          sortItemsWithCustomUndoRedo(dataContext, attribute.id, direction)
        })
      }
    }

    return { success: true }
  }
}

registerDIHandler("dataContext", diDataContextHandler)
