import { observer } from "mobx-react-lite"
import React from "react"
import { gDataBroker } from "../data-model/data-broker"

import "./data-summary.scss"

export const DataSummary = observer(() => {
  const data = gDataBroker.last
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
