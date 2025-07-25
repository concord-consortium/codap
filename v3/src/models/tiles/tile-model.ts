import { cloneDeep } from "lodash"
import { getParent, getSnapshot, getType,
  Instance, SnapshotIn, SnapshotOut, types, ISerializedActionCall } from "mobx-state-tree"
import { applyModelChange } from "../history/apply-model-change"
import { StringBuilder } from "../../utilities/string-builder"
import { v3Id, typeV3Id } from "../../utilities/codap-utils"
import { V2UserTitleModel } from "../data/v2-user-title-model"
import { DisplayUserTypeEnum } from "../stores/user-types"
import { ITileContentModel } from "./tile-content"
import { getTileContentInfo, ITileExportOptions } from "./tile-content-info"
import { TileContentUnion } from "./tile-content-union"

// generally negotiated with app, e.g. single column width for table
export const kDefaultMinWidth = 60

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
    transitionComplete: types.maybe(types.boolean)
  })
  .volatile(self => ({
    isNewlyCreated: false
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
      return kDefaultMinWidth
    },
    // undefined by default, but can be negotiated with app,
    // e.g. width of all columns for table
    get maxWidth(): number | undefined {
      // eslint-disable-next-line no-useless-return
      return
    },
    get isUserResizable() {
      return !!(self.content as any).isUserResizable
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
    setTransitionComplete(complete: boolean) {
      self.transitionComplete = complete
    }
  }))
  .actions(self => ({
    afterAttach() {
      // The afterAttach() method of the tile content gets called when the content is attached to the tile,
      // which often occurs before the tile has been attached to the document. Therefore, the tile model
      // will call the content's afterAttachToDocument() method when the tile model itself is attached.
      if ("afterAttachToDocument" in self.content && typeof self.content.afterAttachToDocument === "function") {
        self.content.afterAttachToDocument()
      }
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
    willRemoveFromDocument() {
      return self.content.willRemoveFromDocument?.()
    }
  }))
  .actions(applyModelChange)

export interface ITileModel extends Instance<typeof TileModel> {}
export interface ITileModelSnapshotIn extends SnapshotIn<typeof TileModel> {}
export interface ITileModelSnapshotOut extends SnapshotOut<typeof TileModel> {}
