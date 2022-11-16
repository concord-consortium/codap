import React, { Children, cloneElement, ReactElement, ReactNode, useState } from "react"
import { DataBroker } from "../models/data/data-broker"
import { EditableComponentTitle } from "./editable-component-title"

import "./codap-component.scss"
import { InspectorPanel } from "./inspector-panel"

interface IProps {
  broker: DataBroker
  children?: ReactNode
}
export const CodapComponent: React.FC<IProps> = ({ broker, children }) => {
  const [componentTitle, setComponentTitle] = useState("")

  const handleTitleChange = (title?: string) => {
    title && setComponentTitle(title)
  }

  return (
      <div className="codap-component">
        <EditableComponentTitle componentTitle={componentTitle}
            onEndEdit={handleTitleChange} />
        {/* inject broker prop into children */}
        {Children.map(children, child => cloneElement(child as ReactElement, { broker }))}
        <InspectorPanel component={"table"}/>
      </div>
  )
}
