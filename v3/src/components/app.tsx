import React from "react"
import { Text } from "./text"
import { useSampleText } from "../hooks/use-sample-text"
import {DropHandler} from "./drop-handler"
import Icon from "../assets/concord.png"

import "./app.scss"

export const App = () => {
  const sampleText = useSampleText()
  return (
    <div className="app">
      <img src={Icon}/>
      <Text text={sampleText} />
      <p>Drag a CSV file into this window to get some data.</p>
      <DropHandler></DropHandler>
    </div>
  )
}
