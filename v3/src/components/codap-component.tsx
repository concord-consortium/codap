import { observer } from "mobx-react-lite"
import React, { useState } from "react"
import { DataSetContext } from "../hooks/use-data-set-context"
import { gDataBroker } from "../models/data/data-broker"
import { EditableComponentTitle } from "./editable-component-title"
import { ITileBaseProps } from "./tiles/tile-base-props"
import { ITileModel } from "../models/tiles/tile-model"

import "./codap-component.scss"

const kMinComponentSize = 50,
      kMaxComponentSize = Number.MAX_VALUE

export interface IProps extends ITileBaseProps {
  tile: ITileModel
  Component: React.ComponentType<ITileBaseProps>;
  tileEltClass: string;
}
export const CodapComponent = observer(({ tile, Component, tileEltClass }: IProps) => {
  const dataset = gDataBroker?.selectedDataSet || gDataBroker?.last
  const [componentTitle, setComponentTitle] = useState("")
  const tContainerWidth = document.getElementById("#app")?.clientWidth
  const [borderElt, setBorderElt] = useState<HTMLElement | null>(null)
  const componentElt = borderElt?.parentElement || null

  const getComponentWidth = () => {
    return componentElt?.getBoundingClientRect().width
  }

  const handleTitleChange = (title?: string) => {
    title && setComponentTitle(title)
  }
  const handleBorderResizeRight = () => {
    const tMaxWidth = tContainerWidth || kMaxComponentSize
    const tMinWidth = kMinComponentSize
  }
  const handleBorderResizeLeft = (e: React.PointerEvent) => {
    const tMaxWidth = tContainerWidth || kMaxComponentSize
    const tMinWidth = kMinComponentSize
    const parent = borderElt?.closest(".rdg-cell")
    const tContainerWidth = getComponentWidth()

    var tNewWidth = DG.ViewUtilities.roundToGrid(info.width - (e.pageX - info.pageX)),
        tLoc;
    tNewWidth = Math.min(Math.max(tNewWidth, tMinWidth), tMaxWidth);
    tLoc = info.left + info.width - tNewWidth;
    if (tLoc < tContainerWidth - tMinWidth) {
      this.parentView.adjust('width', tNewWidth);
      this.parentView.adjust('left', tLoc);
    }
  }

  return (
    <DataSetContext.Provider value={dataset}>
      <div className={`codap-component ${tileEltClass}`}>
        <EditableComponentTitle componentTitle={componentTitle} onEndEdit={handleTitleChange} />
        <Component tile={tile} />
        <div className="codap-component-border right" ref={setBorderElt}onPointerMove={handleBorderResizeRight}/>
        <div className="codap-component-border bottom" />
        <div className="codap-component-border left" onPointerMove={handleBorderResizeLeft}/>
        <div className="codap-component-corner bottom-left" />
        <div className="codap-component-border bottom-rightf" />
      </div>
    </DataSetContext.Provider>
  )
})
