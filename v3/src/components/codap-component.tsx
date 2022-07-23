import React, { Children, cloneElement } from "react"
import { DataBroker } from "../data-model/data-broker"

interface IProps {
  broker: DataBroker;
}
export const CodapComponent: React.FC<IProps> = ({ broker, children }) => {
  return (
    <div className="codap-component">
      {/* inject broker prop into children */}
      {Children.map(children, child => cloneElement(child as any, { broker }))}
    </div>
  )
}
