import { closestCenter, CollisionDetection, rectIntersection } from "@dnd-kit/core"
import { observer } from "mobx-react-lite"
import React from "react"
import { CaseMetadataContext } from "../../hooks/use-case-metadata"
import { useDataSet } from "../../hooks/use-data-set"
import { DataSetContext } from "../../hooks/use-data-set-context"
import { useTileDropOverlay } from "../../hooks/use-drag-drop"
import { InstanceIdContext, useNextInstanceId } from "../../hooks/use-instance-id-context"
import { registerTileCollisionDetection } from "../dnd-detect-collision"
import { ITileBaseProps } from "../tiles/tile-base-props"
import { CaseCard } from "./case-card"
import { ICaseCardModel, isCaseCardModel } from "./case-card-model"
import { kCaseCardIdBase } from "./case-card-types"
import { CaseCardModelContext } from "./use-case-card-model"

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
registerTileCollisionDetection(kCaseCardIdBase, collisionDetection)

export const CaseCardComponent = observer(function CaseCardComponent({ tile }: ITileBaseProps) {
  const instanceId = useNextInstanceId(kCaseCardIdBase)
  // pass in the instance id since the context hasn't been provided yet
  const { setNodeRef } = useTileDropOverlay(instanceId)

  const tableModel: ICaseCardModel | undefined = isCaseCardModel(tile?.content) ? tile?.content : undefined
  const { data, metadata } = useDataSet(tableModel?.data, tableModel?.metadata)

  if (!tableModel) return null

  return (
    <InstanceIdContext.Provider value={instanceId}>
      <DataSetContext.Provider value={data}>
        <CaseMetadataContext.Provider value={metadata}>
          <CaseCardModelContext.Provider value={tableModel}>
            <CaseCard setNodeRef={setNodeRef} />
          </CaseCardModelContext.Provider>
        </CaseMetadataContext.Provider>
      </DataSetContext.Provider>
    </InstanceIdContext.Provider>
  )
})
