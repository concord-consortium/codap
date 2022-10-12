import { useDroppable } from "@dnd-kit/core"
import { observer } from "mobx-react-lite"
import React from "react"
import { DataBroker } from "../../data-model/data-broker"
import { DataSetContext } from "../../hooks/use-data-set-context"
import { InstanceIdContext, useNextInstanceId } from "../../hooks/use-instance-id-context"
import { CaseTable } from "./case-table"

interface IProps {
  broker?: DataBroker;
}
export const CaseTableComponent = observer(({ broker }: IProps) => {
  const instanceId = useNextInstanceId("case-table")
  const data = broker?.selectedDataSet || broker?.last
  const id = `${instanceId}-component-drop-overlay`
  const { setNodeRef } = useDroppable({ id, data: { accepts: ["attribute"] } })

  return (
    <DataSetContext.Provider value={data}>
      <InstanceIdContext.Provider value={instanceId}>
        <CaseTable setNodeRef={setNodeRef} />
      </InstanceIdContext.Provider>
    </DataSetContext.Provider>
  )
})
