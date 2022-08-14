import { observer } from "mobx-react-lite"
import React from "react"
import { useMemo } from "use-memo-one"
import { DataBroker } from "../../../data-model/data-broker"
import { DataSetContext } from "../../../hooks/use-data-set-context"
import { GraphLayout, GraphLayoutContext } from "../models/graph-layout"
import { Graph } from "./graph"

interface IProps {
  broker?: DataBroker;
}
export const GraphComponent = observer(({ broker }: IProps) => {
  const layout = useMemo(() => new GraphLayout(), [])

  return (
    <DataSetContext.Provider value={broker?.last}>
      <GraphLayoutContext.Provider value={layout}>
        <Graph />
      </GraphLayoutContext.Provider>
    </DataSetContext.Provider>
  )
})
