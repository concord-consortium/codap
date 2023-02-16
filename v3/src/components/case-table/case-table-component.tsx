import { closestCenter, CollisionDetection, rectIntersection } from "@dnd-kit/core"
import { observer } from "mobx-react-lite"
import React from "react"
import { useTileDropOverlay } from "../../hooks/use-drag-drop"
import { InstanceIdContext, useNextInstanceId } from "../../hooks/use-instance-id-context"
import { registerTileCollisionDetection } from "../dnd-detect-collision"
import { ITileBaseProps } from "../tiles/tile-base-props"
import { CaseTable } from "./case-table"
import { isCaseTableModel } from "./case-table-model"
import { kCaseTableIdBase } from "./case-table-types"

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

export const CaseTableComponent = observer(({ tile }: ITileBaseProps) => {
  const tableModel = tile?.content
  if (!isCaseTableModel(tableModel)) return null

  const instanceId = useNextInstanceId(kCaseTableIdBase)
  // pass in the instance id since the context hasn't been provided yet
  const { setNodeRef } = useTileDropOverlay(instanceId)

  return (
    <InstanceIdContext.Provider value={instanceId}>
      <CaseTable setNodeRef={setNodeRef} />
    </InstanceIdContext.Provider>
  )
})
