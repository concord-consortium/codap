import { observer } from "mobx-react-lite"
import React from "react"
import { DataBroker } from "../data-model/data-broker"

import "./data-summary.scss"

interface IProps {
  broker?: DataBroker;
}
export const DataSummary = observer(({ broker }: IProps) => {
  const data = broker?.last
  const summary = data
                    ? [
                      `Parsed "${data.name}" with ${data.cases.length} case(s) and attributes:`,
                      "",
                      `${data.attributes.map(attr => attr.name).join(", ")}.`
                    ]
                    : ["No data"]
  return (
    <div className="data-summary">
      {summary.map((line, i) => <p key={`${i}-${line}`}>{line}</p>)}
    </div>
  )
})
