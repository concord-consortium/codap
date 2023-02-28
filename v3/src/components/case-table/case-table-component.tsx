import { closestCenter, CollisionDetection, rectIntersection } from "@dnd-kit/core"
import { observer } from "mobx-react-lite"
import { getEnv } from "mobx-state-tree"
import React from "react"
import { CaseMetadataContext } from "../../hooks/use-case-metadata"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { useTileDropOverlay } from "../../hooks/use-drag-drop"
import { InstanceIdContext, useNextInstanceId } from "../../hooks/use-instance-id-context"
import { ISharedCaseMetadata, kSharedCaseMetadataType } from "../../models/shared/shared-case-metadata"
import { ITileEnvironment } from "../../models/tiles/tile-content"
import { registerTileCollisionDetection } from "../dnd-detect-collision"
import { ITileBaseProps } from "../tiles/tile-base-props"
import { CaseTable } from "./case-table"
import { isCaseTableModel } from "./case-table-model"
import { kCaseTableIdBase } from "./case-table-types"
import { CaseTableModelContext } from "./use-case-table-model"

const collisionDetection: CollisionDetection = (args) => {
  // use rectangle intersection for collection drop zones
  const collisions = rectIntersection(args)
  const collectionDrop = collisions.find(collision => /new-collection.+drop$/.test(`${collision.id}`))
  if (collectionDrop) return [collectionDrop]
  // use closestCenter among column dividers for column resizing within table
  const droppableContainers = args.droppableContainers
                                .filter(container => /attribute-divider:.+drop$/.test(`${container.id}`))
  return closestCenter({ ...args, droppableContainers })
}
registerTileCollisionDetection(kCaseTableIdBase, collisionDetection)

export const CaseTableComponent = observer(function ({ tile }: ITileBaseProps) {
  const env: ITileEnvironment = getEnv(tile)
  const tableModel = tile?.content
  const data = useDataSetContext()
  // find the metadata that corresponds to this DataSet
  const caseMetadata =
    env.sharedModelManager
      ?.getSharedModelsByType(kSharedCaseMetadataType)
       .find((model: ISharedCaseMetadata) => {
        return model.data?.id === data?.id
      }) as ISharedCaseMetadata | undefined
  if (!isCaseTableModel(tableModel)) return null

  const instanceId = useNextInstanceId(kCaseTableIdBase)
  // pass in the instance id since the context hasn't been provided yet
  const { setNodeRef } = useTileDropOverlay(instanceId)

  return (
    <InstanceIdContext.Provider value={instanceId}>
      <CaseMetadataContext.Provider value={caseMetadata}>
        <CaseTableModelContext.Provider value={tableModel}>
          <CaseTable setNodeRef={setNodeRef} />
        </CaseTableModelContext.Provider>
      </CaseMetadataContext.Provider>
    </InstanceIdContext.Provider>
  )
})
