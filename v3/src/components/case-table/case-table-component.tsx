import { useDroppable } from "@dnd-kit/core"
import { observer } from "mobx-react-lite"
import React from "react"
import { InstanceIdContext, useNextInstanceId } from "../../hooks/use-instance-id-context"
import { CaseTable } from "./case-table"
import { ITileBaseProps } from "../tiles/tile-base-props"

interface IProps extends ITileBaseProps {
}
export const CaseTableComponent = observer((props: IProps) => {
  const instanceId = useNextInstanceId("case-table")
  const id = `${instanceId}-component-drop-overlay`
  const { setNodeRef } = useDroppable({ id })

  return (
    <InstanceIdContext.Provider value={instanceId}>
      <CaseTable setNodeRef={setNodeRef} />
    </InstanceIdContext.Provider>
  )
})
