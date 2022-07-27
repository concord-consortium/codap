import React from "react"
import { CaseTable } from "./case-table/case-table"
import { Container } from "./container"
import { DataSummary } from "./data-summary"
import { gDataBroker } from "../data-model/data-broker"
import { DataSet, toCanonical } from "../data-model/data-set"
import { Text } from "./text"
import { useDropHandler } from "../hooks/use-drop-handler"
import { useSampleText } from "../hooks/use-sample-text"
import Icon from "../assets/concord.png"

import "./app.scss"

export function handleImportData(data: Array<Record<string, string>>, fName?: string) {
  const ds = DataSet.create({ name: fName })
  // add attributes
  for (const pName in data[0]) {
    ds.addAttribute({ name: pName })
  }
  // add cases
  ds.addCases(toCanonical(ds, data))
  // add data set
  gDataBroker.addDataSet(ds)
}

export const App = () => {
  const sampleText = useSampleText()

  useDropHandler("#app", handleImportData)

  return (
    <div className="app" data-testid="app">
      <Container>
        {/* each top-level child will be wrapped in a CodapComponent */}
        <DataSummary/>
        <div className="hello-codap3">
          <div>
            <img src={Icon}/>
            <Text text={sampleText} />
            <p>Drag a CSV file into this window to get some data.</p>
          </div>
        </div>
        <CaseTable />
      </Container>
    </div>
  )
}
