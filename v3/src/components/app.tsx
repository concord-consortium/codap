import { DndContext, DragEndEvent, DragStartEvent } from "@dnd-kit/core"
import React, { useEffect } from "react"
import { CaseTable } from "./case-table/case-table"
import {Container} from "./container"
import {DataSummary} from "./data-summary"
import {gDataBroker} from "../data-model/data-broker"
import {DataSet, toCanonical} from "../data-model/data-set"
import {Graph} from "./graph/graph"
import {Text} from "./text"
import { dndDetectCollision } from "./dnd-detect-collision"
import {useDropHandler} from "../hooks/use-drop-handler"
import {useSampleText} from "../hooks/use-sample-text"
import Icon from "../assets/concord.png"
import { importSample, sampleData, SampleType } from "../sample-data"
import { urlParams } from "../utilities/url-params"

import "./app.scss"

export function handleImportData(data: Array<Record<string, string>>, fName?: string) {
  const ds = DataSet.create({name: fName})
  // add attributes
  for (const pName in data[0]) {
    ds.addAttribute({name: pName})
  }
  // add cases
  ds.addCases(toCanonical(ds, data))
  // add data set
  gDataBroker.addDataSet(ds)
}

export const App = () => {
  const sampleText = useSampleText()

  useDropHandler("#app", handleImportData)

  function handleDragStart(evt: DragStartEvent) {
    // console.log("DnDKit [handleDragStart]")
  }

  function handleDragEnd(evt: DragEndEvent) {
    const {active, over} = evt
    if (over?.data?.current?.accepts.includes(active?.data?.current?.type)) {
      over.data.current.onDrop(active)
    }
  }

  useEffect(() => {
    if (gDataBroker.dataSets.size === 0) {
      const sample = sampleData.find(name => urlParams.sample === name)
      sample && importSample(sample as SampleType, handleImportData)
    }
  }, [])

  return (
    <DndContext collisionDetection={dndDetectCollision} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="app" data-testid="app">
        <Container>
          {/* each top-level child will be wrapped in a CodapComponent */}
          <DataSummary/>
          <div className="hello-codap3">
            <div>
              <img src={Icon}/>
              <Text text={sampleText}/>
              <p>Drag a CSV file into this window to get some data.</p>
            </div>
          </div>
          <CaseTable />
          <Graph></Graph>
        </Container>
      </div>
    </DndContext>
  )
}
