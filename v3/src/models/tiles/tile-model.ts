import { cloneDeep } from "lodash"
import { getParent, getSnapshot, getType,
  Instance, SnapshotIn, SnapshotOut, types, ISerializedActionCall,
} from "mobx-state-tree"
import { applyModelChange } from "../history/apply-model-change"
import { StringBuilder } from "../../utilities/string-builder"
import { v3Id, typeV3Id } from "../../utilities/codap-utils"
import { mstReaction } from "../../utilities/mst-reaction"
import { V2UserTitleModel } from "../data/v2-user-title-model"
import { DisplayUserTypeEnum } from "../stores/user-types"
import { ITileContentModel } from "./tile-content"
import { getTileContentInfo, ITileExportOptions } from "./tile-content-info"
import { TileContentUnion } from "./tile-content-union"
import { kDefaultMinWidth } from "./tile-layout"

export interface IDragTileItem {
  rowIndex: number;
  rowHeight?: number;
  tileIndex: number;
  tileId: string;       // original tile id
  tileContent: string;  // modified tile contents
  tileType: string;
}

export interface IDragTiles {
  sourceDocId: string;
  items: IDragTileItem[];
}

export function cloneTileSnapshotWithoutId(tile: ITileModel) {
  const { id, display, ...copy } = cloneDeep(getSnapshot(tile))
  return copy
}

export function cloneTileSnapshotWithNewId(tile: ITileModel, newId?: string) {
  const content = tile.content.tileSnapshotForCopy
  const { id, display, ...copy } = cloneDeep(getSnapshot(tile))
  return { id: newId || v3Id("TILE"), ...copy, content }
}

export function getTileModel(tileContentModel: ITileContentModel) {
  try {
    const parent = getParent(tileContentModel)
    return getType(parent).name === "TileModel" ? parent as ITileModel : undefined
  } catch (e) {
    console.warn(`Unable to find tile model for content ${tileContentModel}`)
    return undefined
  }
}

export const TileModel = V2UserTitleModel.named("TileModel")
  .props({
    // if not provided, will be generated
    id: typeV3Id("TILE"),
    // whether to restrict display to certain users
    display: DisplayUserTypeEnum,
    // e.g. "TextContentModel", ...
    content: TileContentUnion,
    cannotClose: types.maybe(types.boolean),
    // API-controlled flag: when false, prevents user from resizing a specific component instance.
    // Default (undefined) means resizable. Set via API update requests.
    _isResizable: types.maybe(types.boolean),
  })
  .volatile(self => ({
    isNewlyCreated: false,
    transitionComplete: false
  }))
  .preProcessSnapshot(snapshot => {
    // early development versions of v3 had a `title` property
    const _title = snapshot._title ?? ((snapshot as any).title || undefined)
    const tileType = snapshot.content.type
    const preProcessor = getTileContentInfo(tileType)?.tileSnapshotPreProcessor
    const snap = { ...snapshot, _title }
    return preProcessor ? preProcessor(snap) : snap
  })
  .views(self => ({
    // generally negotiated with tile, e.g. single column width for table
    get minWidth() {
      return (self.content as any).minWidth ?? kDefaultMinWidth
    },
    // undefined by default, but can be negotiated with app,
    // e.g. width of all columns for table
    get maxWidth(): number | undefined {
      // eslint-disable-next-line no-useless-return
      return
    },
    // Whether this component type supports resizing by the user.
    // True by default; content models can opt out by returning false.
    get isUserResizable() {
      return (self.content as any).isUserResizable !== false
    },
    // Combined resizability: true if the content type supports resizing AND the API hasn't disabled it.
    get isResizable() {
      return self._isResizable !== false && (self.content as any).isUserResizable !== false
    },
    get isUserClosable() {
      return !!(self.content as any).isUserClosable
    },
    exportJson(options?: ITileExportOptions): string | undefined {
      const { includeId, excludeTitle, ...otherOptions } = options || {}
      let contentJson = (self.content as any).exportJson(otherOptions)
      if (!contentJson) return
      if (options?.rowHeight) {
        // add comma before layout/height entry
        contentJson = contentJson[contentJson.length - 1] === "\n"
                ? `${contentJson.slice(0, contentJson.length - 1)},\n`
                : `${contentJson},`
      }

      const builder = new StringBuilder()
      builder.pushLine("{")
      if (includeId) {
        builder.pushLine(`"id": "${self.id}",`, 2)
      }
      if (self.name) builder.pushLine(`"name": "${self.name}"`, 2)
      if (!excludeTitle && self._title) {
        builder.pushLine(`"_title": "${self._title}",`, 2)
      }
      builder.pushBlock(`"content": ${contentJson}`, 2)
      options?.rowHeight && builder.pushLine(`"layout": { "height": ${options.rowHeight} }`, 2)
      builder.pushLine(`}`)
      return builder.build()
    }
  }))
  .actions(self => ({
    setNewlyCreated(newlyCreated: boolean) {
      self.isNewlyCreated = newlyCreated
    },
    setCannotClose(cannotClose?: boolean) {
      self.cannotClose = cannotClose
    },
    setIsResizable(isResizable?: boolean) {
      self._isResizable = isResizable
    },
    setTransitionComplete(complete: boolean) {
      self.transitionComplete = complete
    }
  }))
  .actions(self => ({
    afterAttach() {
      // The afterAttach() method of the tile content gets called when the content is attached to the tile,
      // which often occurs before the tile has been attached to the document. Therefore, the tile model
      // will call the content's afterAttachToDocument() method when the tile model itself is attached.
      // Additionally, this is in a reaction, so that if the content model changes, the new content model
      // will also have its afterAttachToDocument() method called.
      // Currently that only happens when a snapshot is applied.
      mstReaction(
        () => self.content,
        (content) => {
          if (content && "afterAttachToDocument" in content && typeof content.afterAttachToDocument === "function") {
            content.afterAttachToDocument()
          }
        },
        { name: `TileModel [${self.id}] afterAttachToDocument`, fireImmediately: true },
        [ self ]
      )
    },
    onTileAction(call: ISerializedActionCall) {
      self.content.onTileAction?.(call)
    },
    prepareSnapshot() {
      return self.content.prepareSnapshot()
    },
    completeSnapshot() {
      self.content.completeSnapshot()
    },
    afterApplySnapshot() {
      self.content.afterApplySnapshot()
    },
    willRemoveFromDocument() {
      return self.content.willRemoveFromDocument?.()
    }
  }))
  .actions(applyModelChange)

export interface ITileModel extends Instance<typeof TileModel> {}
export interface ITileModelSnapshotIn extends SnapshotIn<typeof TileModel> {}
export interface ITileModelSnapshotOut extends SnapshotOut<typeof TileModel> {}
