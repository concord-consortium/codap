import React from "react"
import { useMemo } from "use-memo-one"
import { DataBroker } from "../../../data-model/data-broker"
import { GraphLayout, GraphLayoutContext } from "../models/graph-layout"
import { Graph } from "./graph"

interface IProps {
  broker?: DataBroker;
}
export const GraphComponent = ({ broker }: IProps) => {
  const layout = useMemo(() => new GraphLayout(), [])

  return (
    <GraphLayoutContext.Provider value={layout}>
      <Graph broker={broker} />
    </GraphLayoutContext.Provider>
  )
}
