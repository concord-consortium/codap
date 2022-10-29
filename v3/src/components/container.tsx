import React, { ReactNode } from "react"
import { CodapComponent } from "./codap-component"
import { gDataBroker } from "../models/data/data-broker"

import "./container.scss"

interface IProps {
  children: ReactNode
}
export const Container: React.FC<IProps> = ({ children }) => {
  const childArray = Array.isArray(children) ? children : [children]
  return (
    <div className="codap-container">
      {/* wrap each child in a CodapComponent component */}
      {[0, 1, 2, 3].map(i => {
        return (
          <CodapComponent key={`component-${i}`} broker={gDataBroker}>
            {i < childArray.length
              ? childArray[i]
              : <div className="component-placeholder">{`Placeholder ${i + 1}`}</div>}
          </CodapComponent>
        )
      })}
    </div>
  )
}
