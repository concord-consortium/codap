import React from "react"

interface IProps {

}
export const CodapComponent: React.FC<IProps> = ({ children }) => {
  return (
    <div className="codap-component">
      {children}
    </div>
  )
}
