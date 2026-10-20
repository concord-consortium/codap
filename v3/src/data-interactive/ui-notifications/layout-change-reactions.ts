import { IReactionDisposer, reaction } from "mobx"
import { appState } from "../../models/app-state"
import { IFreeTileLayout, isFreeTileRow } from "../../models/document/free-tile-row"
import { persistentState } from "../../models/persistent-state"
import { UiLayoutChangeNotice } from "./ui-notification-types"
import { UiNotificationMonitorManager } from "./ui-notification-monitor-manager"

export interface LayoutChangeInstalled {
  uninstall(): void
}

type GetDocument = () => {
  content?: {
    rowMap?: { forEach?: (cb: (row: any) => void) => void }
    tileMap?: { get?: (id: string) => { content?: { type?: string } } | undefined }
  }
} | undefined

interface TileInfo {
  layout: IFreeTileLayout
  tileId: string
  type?: string
}

function emitLayoutChange(
  manager: UiNotificationMonitorManager,
  setting: string,
  value: unknown,
  previousValue: unknown,
  componentId?: string
) {
  const notice: UiLayoutChangeNotice = {
    eventType: "layoutChange",
    region: componentId ? "workspace" : "header",
    setting,
    value,
    previousValue,
    monitor: { id: -1 }
  }
  if (componentId) {
    (notice as UiLayoutChangeNotice & { target?: { componentId?: string } }).target = { componentId }
  }
  manager.deliver(notice)
}

function iterateFreeTileLayouts(getDocument: GetDocument): TileInfo[] {
  const doc = getDocument()
  const infos: TileInfo[] = []
  const rowMap = doc?.content?.rowMap
  const tileMap = doc?.content?.tileMap
  if (!rowMap?.forEach) return infos
  rowMap.forEach(row => {
    if (isFreeTileRow(row)) {
      row.tiles.forEach((layout: IFreeTileLayout) => {
        const tileId = layout.tileId
        const type = tileMap?.get?.(tileId)?.content?.type
        infos.push({ layout, tileId, type })
      })
    }
  })
  return infos
}

export function installLayoutChangeReactions(
  manager: UiNotificationMonitorManager,
  options: { getDocument?: GetDocument } = {}
): LayoutChangeInstalled {
  const getDocument: GetDocument = options.getDocument ?? (() => appState.document as any)
  const disposers: IReactionDisposer[] = []
  const perLayoutDisposers = new WeakMap<IFreeTileLayout, IReactionDisposer[]>()
  const trackedLayouts = new Set<IFreeTileLayout>()
  // Snapshot of tile ids seen on the previous reaction run, used to detect additions/removals.
  let prevTileInfoById = new Map<string, { layout: IFreeTileLayout; type?: string }>()
  // True until the initial `fireImmediately: true` run completes — suppresses add/remove
  // notices for pre-existing tiles at first-subscriber attach.
  let isInitialRun = true

  // 1) toolbarPosition
  disposers.push(
    reaction(
      () => persistentState.toolbarPosition,
      (value, previousValue) => {
        emitLayoutChange(manager, "toolbarPosition", value, previousValue)
      },
      { fireImmediately: false }
    )
  )

  function trackLayout(layout: IFreeTileLayout) {
    if (trackedLayouts.has(layout)) return
    trackedLayouts.add(layout)
    const tileId = layout.tileId
    const layoutDisposers: IReactionDisposer[] = [
      reaction(
        () => layout.isMinimized ?? false,
        (value, previousValue) => {
          emitLayoutChange(manager, "tileMinimized", value, previousValue, tileId)
        },
        { fireImmediately: false }
      ),
      reaction(
        () => ({ width: layout.width, height: layout.height }),
        (value, previousValue) => {
          emitLayoutChange(manager, "tileSize", value, previousValue, tileId)
        },
        { fireImmediately: false, equals: (a, b) => a.width === b.width && a.height === b.height }
      ),
      reaction(
        () => ({ x: layout.x, y: layout.y }),
        (value, previousValue) => {
          emitLayoutChange(manager, "tilePosition", value, previousValue, tileId)
        },
        { fireImmediately: false, equals: (a, b) => a.x === b.x && a.y === b.y }
      )
    ]
    perLayoutDisposers.set(layout, layoutDisposers)
  }

  function forgetLayout(layout: IFreeTileLayout) {
    const ds = perLayoutDisposers.get(layout)
    if (ds) for (const d of ds) d()
    perLayoutDisposers.delete(layout)
    trackedLayouts.delete(layout)
  }

  // 2) Discover existing tiles + listen for new ones + emit tileAdded/tileRemoved
  disposers.push(
    reaction(
      () => iterateFreeTileLayouts(getDocument),
      (infos) => {
        const nextById = new Map<string, { layout: IFreeTileLayout; type?: string }>()
        for (const info of infos) nextById.set(info.tileId, { layout: info.layout, type: info.type })

        // Added tiles
        for (const [tileId, { layout, type }] of nextById) {
          if (!prevTileInfoById.has(tileId)) {
            trackLayout(layout)
            if (!isInitialRun) {
              emitLayoutChange(
                manager,
                "tileAdded",
                { componentId: tileId, ...(type != null ? { type } : {}) },
                null,
                tileId
              )
            }
          }
        }

        // Removed tiles
        for (const [tileId, prev] of prevTileInfoById) {
          if (!nextById.has(tileId)) {
            forgetLayout(prev.layout)
            if (!isInitialRun) {
              emitLayoutChange(
                manager,
                "tileRemoved",
                null,
                { componentId: tileId, ...(prev.type != null ? { type: prev.type } : {}) },
                tileId
              )
            }
          }
        }

        prevTileInfoById = nextById
        isInitialRun = false
      },
      { fireImmediately: true }
    )
  )

  return {
    uninstall() {
      for (const d of disposers) d()
      for (const l of trackedLayouts) {
        const ds = perLayoutDisposers.get(l)
        if (ds) for (const d of ds) d()
      }
      trackedLayouts.clear()
      prevTileInfoById = new Map()
    }
  }
}
