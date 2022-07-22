import React from "react"
import { DataSummary } from "./data-summary"
import { gDataBroker } from "../data-model/data-broker"
import { DataSet, toCanonical } from "../data-model/data-set"
import { Text } from "./text"
import { useSampleText } from "../hooks/use-sample-text"
import {DropHandler} from "./drop-handler"
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
  return (
    <div className="app" data-testid="app">
      <DataSummary/>
      <img src={Icon}/>
      <Text text={sampleText} />
      <p>Drag a CSV file into this window to get some data.</p>
      <DropHandler onImportData={handleImportData}></DropHandler>
    </div>
  )
}
