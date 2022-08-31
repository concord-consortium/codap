import { ChakraProvider, extendTheme } from "@chakra-ui/react"
import { DndContext, DragEndEvent, DragStartEvent } from "@dnd-kit/core"
import React, { useCallback, useEffect, useState } from "react"
import { CaseTable } from "./case-table/case-table"
import {Container} from "./container"
import {DataSummary} from "./data-summary"
import {gDataBroker} from "../data-model/data-broker"
import {DataSet, IDataSet, toCanonical} from "../data-model/data-set"
import { GraphComponent } from "./graph/components/graph-component"
import {Text} from "./text"
import { dndDetectCollision } from "./dnd-detect-collision"
import {useDropHandler} from "../hooks/use-drop-handler"
import { useKeyStates } from "../hooks/use-key-states"
import {useSampleText} from "../hooks/use-sample-text"
import Icon from "../assets/concord.png"
import { importSample, sampleData, SampleType } from "../sample-data"
import { urlParams } from "../utilities/url-params"
import { CodapV2Document } from "../v2/codap-v2-document"
import appTheme from "./app-theme.json"

import "./app.scss"

export function handleImportDataSet(data: IDataSet) {
  // add data set
  gDataBroker.addDataSet(data)
}

export const App = () => {
  const sampleText = useSampleText()
  const [v2Document, setV2Document] = useState<CodapV2Document | undefined>()

  const theme = extendTheme(appTheme)

  useKeyStates()

  const _handleImportDataSet = useCallback((data: IDataSet) => {
    handleImportDataSet(data)
    setV2Document(undefined)
  }, [])

  const handleImportDocument = useCallback((document: CodapV2Document) => {
    // add data sets
    document.datasets.forEach(data => gDataBroker.addDataSet(data))
    setV2Document(document)
  }, [])

  useDropHandler({
    selector: "#app",
    onImportDataSet: _handleImportDataSet,
    onImportDocument: handleImportDocument
  })

  function handleDragStart(evt: DragStartEvent) {
    // console.log("DnDKit [handleDragStart]")
  }

  function handleDragEnd(evt: DragEndEvent) {
    const {active, over} = evt
    if (over?.data?.current?.accepts.includes(active?.data?.current?.type)) {
      over.data.current.onDrop(active)
    }
  }

  function createNewStarterDataset() {
    const newData = [{AttributeName: ""}]
    const ds = DataSet.create({name: "New Dataset"})
    ds.addAttribute({name: "AttributeName"})
    ds.addCases(toCanonical(ds, newData))
    gDataBroker.addDataSet(ds)
  }

  useEffect(() => {
    if (gDataBroker.dataSets.size === 0) {
      const sample = sampleData.find(name => urlParams.sample === name)
      if (sample) {
        importSample(sample as SampleType, handleImportDataSet)
      } else {
        createNewStarterDataset()
      }
    }
  }, [])

  return (
    <ChakraProvider theme={theme}>
      <DndContext collisionDetection={dndDetectCollision} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="app" data-testid="app">
          <Container>
            {/* each top-level child will be wrapped in a CodapComponent */}
            <DataSummary v2Document={v2Document} />
            <div className="hello-codap3">
              <div>
                <img src={Icon}/>
                <Text text={sampleText}/>
                <p>Drag a CSV file into this window to get some data.</p>
              </div>
            </div>
            <CaseTable />
            <GraphComponent></GraphComponent>
          </Container>
        </div>
      </DndContext>
    </ChakraProvider>
  )
}
