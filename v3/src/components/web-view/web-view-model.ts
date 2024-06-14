import iframePhone from "iframe-phone"
import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { DIMessage } from "../../data-interactive/iframe-phone-types"
import { IDataSet } from "../../models/data/data-set"
import { ITileContentModel, TileContentModel } from "../../models/tiles/tile-content"
import { appState } from "../../models/app-state"
import { kWebViewTileType } from "./web-view-defs"

export const WebViewModel = TileContentModel
  .named("WebViewModel")
  .props({
    type: types.optional(types.literal(kWebViewTileType), kWebViewTileType),
    url: "",
    state: types.frozen<unknown>()
  })
  .volatile(self => ({
    dataInteractiveController: undefined as iframePhone.IframePhoneRpcEndpoint | undefined,
    isPlugin: false,
    // fields used by the Collaborative plugin
    handledDataSets: {} as Record<string, IDataSet>,
    preventAttributeDeletion: false,
    respectEditableItemAttribute: false
  }))
  .actions(self => ({
    setDataInteractiveController(controller?: iframePhone.IframePhoneRpcEndpoint) {
      self.dataInteractiveController = controller
    },
    setIsPlugin(isPlugin: boolean) {
      self.isPlugin = isPlugin
    },
    setSavedState(state: unknown) {
      self.state = state
    },
    setUrl(url: string) {
      self.url = url
    },
    broadcastMessage(message: DIMessage, callback: iframePhone.ListenerCallback) {
      self.dataInteractiveController?.call(message, callback)
    },
    setPreventAttributeDeletion(value: boolean) {
      for (const id in self.handledDataSets) {
        self.handledDataSets[id].setPreventAttributeDeletion(value)
      }
      self.preventAttributeDeletion = value
    },
    setRespectEditableItemAttribute(value: boolean) {
      for (const id in self.handledDataSets) {
        self.handledDataSets[id].setRespectEditableItemAttribute(value)
      }
      self.respectEditableItemAttribute = value
    }
  }))
  .actions(self => ({
    prepareSnapshot() {
      return new Promise<void>((resolve) => {
        if (self.dataInteractiveController) {
          self.dataInteractiveController?.call({
            "action": "get",
            "resource": "interactiveState"
          } as any, (result) => {
            if (result) {
              const state = result.values || result.state
              if (state) {
                self.setSavedState(state)
              }
            }
            resolve()
          })
        }
        else {
          resolve()
        }
      })
    },
    removeHandledDataSet(dataSet: IDataSet) {
      delete self.handledDataSets[dataSet.id]
    },
    addHandledDataSet(dataSet: IDataSet) {
      const webViews = appState.document.content?.getTilesOfType(kWebViewTileType)
      webViews?.forEach(webView => {
        if (isWebViewModel(webView.content) && webView.content.isPlugin) {
          webView.content.removeHandledDataSet(dataSet)
        }
      })
      self.handledDataSets[dataSet.id] = dataSet
      dataSet.setPreventAttributeDeletion(self.preventAttributeDeletion)
      dataSet.setRespectEditableItemAttribute(self.respectEditableItemAttribute)
    }
  }))
export interface IWebViewModel extends Instance<typeof WebViewModel> {}
export interface IWebViewSnapshot extends SnapshotIn<typeof WebViewModel> {}

export function isWebViewModel(model?: ITileContentModel): model is IWebViewModel {
  return model?.type === kWebViewTileType
}
