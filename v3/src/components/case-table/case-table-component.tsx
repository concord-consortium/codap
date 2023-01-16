import { useDroppable } from "@dnd-kit/core"
import { observer } from "mobx-react-lite"
import React from "react"
import { InstanceIdContext, useNextInstanceId } from "../../hooks/use-instance-id-context"
import { CaseTable } from "./case-table"
import { isCaseTableModel } from "./case-table-model"
import { ITileBaseProps } from "../tiles/tile-base-props"

export const CaseTableComponent = observer(({ tile }: ITileBaseProps) => {
  const tableModel = tile?.content
  if (!isCaseTableModel(tableModel)) return null

  const instanceId = useNextInstanceId("case-table")
  const id = `${instanceId}-component-drop-overlay`
  const { setNodeRef } = useDroppable({ id })

  return (
    <InstanceIdContext.Provider value={instanceId}>
      <CaseTable setNodeRef={setNodeRef} />
    </InstanceIdContext.Provider>
  )
})
