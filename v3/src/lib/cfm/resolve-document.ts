import { getSnapshot } from "mobx-state-tree"
import { kCaseTableTileType } from "../../components/case-table/case-table-defs"
import { kCaseTableDefaultHeight, kCaseTableDefaultWidth } from "../../components/case-table/case-table-types"
import { kWebViewTileType } from "../../components/web-view/web-view-defs"
import { IWebViewSnapshot } from "../../components/web-view/web-view-model"
import { getPluginsRootUrl, kImporterPluginUrl } from "../../constants"
import { createCodapDocument, isCodapDocument } from "../../models/codap/create-codap-document"
import { IDocumentModelSnapshot } from "../../models/document/document"
import { IDocumentMetadata } from "../../models/document/document-metadata"
import { IFreeTileInRowOptions } from "../../models/document/free-tile-row"
import { serializeCodapV3Document } from "../../models/document/serialize-document"
import { addDataSetAndMetadata } from "../../models/shared/shared-data-tile-utils"
import { ITileModelSnapshotIn } from "../../models/tiles/tile-model"
import { convertParsedCsvToDataSet, importCsvContent } from "../../utilities/csv-import"
import { safeJsonParse } from "../../utilities/js-utils"
import { ICodapV2Case, isV2InternalContext } from "../../v2/codap-v2-data-context-types"
import { ICodapV2DocumentJson, isCodapV2Document, kV2AppName } from "../../v2/codap-v2-types"

/**
 * find expected content from mimeType or URL path extension
 * @param mimeType
 * @param url
 * @return mimeType
 */
export function getExpectedContentType(mimeType?: string, url?: string) {
  if (mimeType) {
    return mimeType
  }
  const extensionMap: Record<string, string> = {
    codap: 'application/vnd.codap+json',
    codap3: 'application/vnd.codap+json',
    json: 'application/json',
    geojson: 'application/geo+json',
    csv: 'application/csv',
    txt: 'application/csv'
  }
  const parsedURL = url ? new URL(url) : undefined
  const path = parsedURL?.pathname
  if (path) {
    return extensionMap[path.replace(/.*\./g, '')]
  }
}

function makeEmptyDocument(): IDocumentModelSnapshot {
  // TODO: default name? { name: t("DG.Document.defaultDocumentName") }
  return getSnapshot(createCodapDocument())
}

function makePluginDocument(gameState: unknown, pluginName: string, pluginPath: string): IDocumentModelSnapshot {
  const document = createCodapDocument()

  const webViewModelSnap: IWebViewSnapshot = {
    type: kWebViewTileType,
    subType: "plugin",
    url: `${getPluginsRootUrl()}${pluginPath}`,
    state: gameState
  }
  const options: Partial<IFreeTileInRowOptions> = { isHidden: true }
  document.content?.insertTileSnapshotInDefaultRow({
    _title: pluginName,
    content: webViewModelSnap
  }, options)

  const result = getSnapshot(document)
  return result
}

function makeCSVDocument(contents: string, urlString: string, dataSetName: string): Promise<IDocumentModelSnapshot> {
  return new Promise<IDocumentModelSnapshot>(function(resolve, reject) {
    importCsvContent(contents, async (results) => {
      const dataSet = convertParsedCsvToDataSet(results, dataSetName)
      const doc = createCodapDocument()
      const tileSnap: ITileModelSnapshotIn = { content: { type: kCaseTableTileType } }
      const options: IFreeTileInRowOptions = {
        x: 5, y: 5, width: kCaseTableDefaultWidth, height: kCaseTableDefaultHeight
      }
      const tableTile = doc.content?.insertTileSnapshotInDefaultRow(tileSnap, options)
      if (tableTile) {
        addDataSetAndMetadata(tableTile, dataSet, true)
        resolve(serializeCodapV3Document(doc))
      }
    })
  })
}

function makeGeoJSONDocument(contents: unknown, urlString: string, datasetName: string): IDocumentModelSnapshot {
  const gameState = {
    contentType: 'application/geo+json',
    text: contents,
    name: urlString,
    datasetName
  }
  return makePluginDocument(gameState, 'Import GeoJSON', kImporterPluginUrl)
}

/*
 * Note: The following code is left in place but commented out because it implements some v2
 * functionality that we may want to support at some point.
 * - documents with externally stored data contexts
 * - "fixing" of documents with duplicate case IDs
 * - support of documents with empty metadata fields
 */

/*
  * Resolve a single external document ID reference
  */
// function v2DataContextPromise(iDataContext: CodapV2Context): Promise<ICodapV2DataContext | ICodapV2GameContext> {
//   return new Promise(function(resolve, reject) {
//     // instantiate external document ID references
//     if (isV2ExternalContext(iDataContext)) {
//       // TODO: do we need to support documents with external data contexts?
//       // const params = { recordid: iDataContext.externalDocumentId }
//       // if (DG.get('runKey')) {
//       //   params.runKey = DG.get('runKey')
//       //   const hashIndex = params.runKey.indexOf('#')
//       //   if (hashIndex >= 0)
//       //     {params.runKey = params.runKey.substr(0, hashIndex)}
//       // }
//       // $.ajax({
//       //   // external document references were only used with the
//       //   // Concord Document Store
//       //   url: '//document-store.concord.org/document/open',
//       //   data: params,
//       //   dataType: 'json',
//       //   xhrFields: { withCredentials: true },
//       //   success(iContents) {
//       //     resolve(iContents)
//       //   },
//       //   error(jqXHR, textStatus, errorThrown) {
//       //     reject(errorThrown || textStatus)
//       //   }
//       // })
//     }
//     // standard data contexts can just be resolved
//     else {
//       resolve(iDataContext)
//     }
//   })
// }

/*
  * Resolve any external document ID references
  */
// function v2DocContentsPromise(iDocContents: ICodapV2DocumentJson): Promise<ICodapV2DocumentJson> {
//   return new Promise(function(resolve, reject) {
//     const dataContexts = iDocContents?.contexts,
//         dataContextPromises = dataContexts?.map(function(iDataContext) {
//                                 return v2DataContextPromise(iDataContext)
//                               })
//     // Once all external document references have been resolved...
//     if (dataContextPromises) {
//       Promise.all(dataContextPromises)
//         .then(function(iResolvedDataContexts) {
//                 // replace the array of pre-processed context objects
//                 // with the array of resolved context promises
//                 iDocContents.contexts = iResolvedDataContexts
//                 resolve(iDocContents)
//               },
//               function(iReason) {
//                 reject(iReason)
//               })
//     }
//     else {
//       resolve(iDocContents)
//     }
//   })
// }

function v2RemoveDuplicateCaseIDs(content: ICodapV2DocumentJson): ICodapV2DocumentJson {
  const cases: Record<number, ICodapV2Case> = {}
  let duplicates: Record<number, ICodapV2Case> = {}

  if (content.contexts) {
    content.contexts.forEach(function(context) {
      if (isV2InternalContext(context)) {
        if (context.collections) {
          context.collections.forEach(function(collection) {
            if (collection.cases) {
              collection.cases.forEach(function(iCase) {
                const id = iCase.guid
                if (!cases[id]) {
                  cases[id] = iCase
                }
                else {
                  duplicates[id] = iCase
                }
              })
            }
            Object.entries(duplicates).forEach(function([id, aCase]) {
              const found = collection.cases.indexOf(aCase)
              if (found >= 0) {
                collection.cases.splice(found, 1)
                console.warn("validateDocument: removed case with duplicate ID: '%@'", id)
              }
            })
            duplicates = {}
          })
        }
      }
    })
  }
  return content
}

function validateV2Document(_content: unknown): Maybe<ICodapV2DocumentJson> {
  if (typeof _content === 'string') {
    _content = safeJsonParse(_content)
  }
  if (!_content || !isCodapV2Document(_content)) return

  // October, 2017: There have been as-yet-unexplained occurrences of documents
  // with duplicate cases. Rather than failing outright, we eliminate the
  // duplicate cases, logging their existence so that (1) users can continue to
  // use the previously corrupt documents and (2) the logs can be used to try
  // to narrow down the circumstances under which the corruption occurs.
  const content = v2RemoveDuplicateCaseIDs(_content)

  // Legacy documents created manually using scripts can have empty metadata fields.
  // We grandfather these documents in by requiring that the metadata fields exist and are empty.
  // We log when these files are encountered, however, in hopes that they eventually get fixed.
  if ((content.appName === "") && (content.appVersion === "") && (content.appBuildNum === "")) {
    console.warn(`File '${content.name}' bypassed validation with empty metadata.` +
                " This file should be re-saved with valid metadata.")
    return content
  }

  return (content.appName === kV2AppName) && !!content.appVersion && !!content.appBuildNum ? content : undefined
}

export function resolveDocument(iDocContents: any, iMetadata: IDocumentMetadata): Promise<IDocumentModelSnapshot> {
  return new Promise(function (resolve, reject) {
    const metadata = iMetadata || {}
    const urlString = metadata.url || (metadata.filename ? `file:${metadata.filename}` : "")
    const expectedContentType = getExpectedContentType(metadata.contentType, urlString)
    const url = urlString ? new URL(urlString) : undefined
    const urlPath = url?.pathname
    const datasetName = urlPath ? urlPath.replace(/.*\//g, '').replace(/\..*/, '') : 'data'
    let contentType

    if (!expectedContentType || expectedContentType.includes('json')) {
      if (typeof iDocContents === 'string') {
        try {
          iDocContents = JSON.parse(iDocContents)
        }
        catch (ex) {
          reject(`JSON parse error in "${urlString}"`)
          return
        }
      }
      const isV2Doc = isCodapV2Document(iDocContents)
      const isV3Doc = isCodapDocument(iDocContents)
      if (isV2Doc || isV3Doc) {
        if (isV2Doc) {
          iDocContents = validateV2Document(iDocContents)
        }
        contentType = 'application/vnd.codap+json'
      } else if (['FeatureCollection', 'Topology'].includes(`${iDocContents.type}`)) {
        contentType = 'application/vnd.geo+json'
      }
    } else {
      contentType = expectedContentType
    }

    // CFM: empty document contents => blank document associated with a particular Provider
    if (!iDocContents) {
      resolve(makeEmptyDocument())
    }
    else if (contentType === 'application/csv') {
      resolve(makeCSVDocument(iDocContents, urlString, datasetName))
    }
    else if (contentType === 'application/vnd.geo+json') {
      resolve(makeGeoJSONDocument(iDocContents, urlString, datasetName))
    }
    else if (contentType === 'application/vnd.codap+json') {
      resolve(iDocContents)
    }
    else {
      reject(`Error opening document: "${urlString}" -- unknown mime type: "${contentType}"`)
    }
  })
}
