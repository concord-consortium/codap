import React, { Children, cloneElement, ReactElement, useState } from "react"
import { DataBroker } from "../data-model/data-broker"

import "./codap-component.scss"
import { EditableComponentTitle } from "./editable-component-title"

interface IProps {
  broker: DataBroker;
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
    </div>
  )
}
