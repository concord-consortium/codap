import React, { Children, cloneElement, ReactElement, ReactNode } from "react"
import { DataBroker } from "../data-model/data-broker"

import "./codap-component.scss"

interface IProps {
  broker: DataBroker
  children?: ReactNode
}
export const CodapComponent: React.FC<IProps> = ({ broker, children }) => {
  return (
    <div className="codap-component">
      {/* inject broker prop into children */}
      {Children.map(children, child => cloneElement(child as ReactElement, { broker }))}
    </div>
  )
}
