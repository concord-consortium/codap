import React from "react"
import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import { kGraphAdornmentsClass } from "../graphing-types"
import { useGraphLayoutContext } from "../models/graph-layout"
import { Adornment } from "./adornment"
import { getAdornmentContentInfo } from "./adornment-content-info"
import { IAdornmentModel } from "./adornment-models"
import { useInstanceIdContext } from "../../../hooks/use-instance-id-context"
import { useTileModelContext } from "../../../hooks/use-tile-model-context"
import { useDataConfigurationContext } from "../hooks/use-data-configuration-context"

import "./adornments.scss"

export const Adornments = observer(function Adornments() {
  const graphModel = useGraphContentModelContext(),
    dataConfig = useDataConfigurationContext(),
    instanceId = useInstanceIdContext(),
    layout = useGraphLayoutContext(),
    { isTileSelected } = useTileModelContext(),
    adornments = graphModel.adornments

  if (!adornments?.length) return null

  // The subPlotKey is an object that contains the attribute IDs and categorical values for the
  // current subplot. It's used to uniquely identify the current subplot. Since it's possible to
  // have the same attribute on two axes or splits, we need to make sure the subPlotKey is unique.
  // So if an attribute is on more than one axis or split, we set the value of that attribute's ID
  // to "__IMPOSSIBLE__" instead of overwriting the key's value because it's impossible for a
  // single case to have two different values for the same attribute.
  const updateSubPlotKey = (subPlotKey: Record<string, string>, attrId: string, cat: string) => {
    const newSubPlotKey = { ...subPlotKey }
    if (cat) {
      const propertyAlreadyPresent = Object.keys(newSubPlotKey).includes(attrId)
      newSubPlotKey[attrId] = propertyAlreadyPresent && newSubPlotKey[attrId] !== cat
        ? "__IMPOSSIBLE__"
        : cat
    }
    return newSubPlotKey
  }

  const xAttrId = dataConfig?.attributeID("x"),
    xAttrType = dataConfig?.attributeType("x"),
    xCatSet = layout.getAxisMultiScale('bottom').categorySet,
    xCats = xAttrType === "categorical" && xCatSet ? Array.from(xCatSet.values) : [""],
    yAttrId = dataConfig?.attributeID("y"),
    yAttrType = dataConfig?.attributeType("y"),
    yCatSet = layout.getAxisMultiScale("left").categorySet,
    yCats = yAttrType === "categorical" && yCatSet ? Array.from(yCatSet.values) : [""],
    topAttrId = dataConfig?.attributeID("topSplit"),
    topCatSet = layout.getAxisMultiScale("top").categorySet,
    topCats = topCatSet ? Array.from(topCatSet.values) : [""],
    rightAttrId = dataConfig?.attributeID("rightSplit"),
    rightCatSet = layout.getAxisMultiScale("rightCat").categorySet,
    rightCats = rightCatSet ? Array.from(rightCatSet.values) : [""]

  // When a graph contains multiple sub-plots, each adornment needs to be rendered once per sub-plot.
  // For placing the adornments, we build a CSS grid where each cell corresponds to a subplot of the
  // graph. This "outer grid" is determined by the number of repetitions of the bottom and left axes
  // (the number of repetitions is determined by the number of categories in the top and right splits).
  // Inside each cell of the outer grid, we build an "inner grid" which is determined by the attributes
  // on the bottom and left axes.
  const outerGridCells: React.JSX.Element[] = []
  const { left, top, width, height } = layout.computedBounds.plot
  const bottomRepetitions = dataConfig?.numRepetitionsForPlace('bottom') ?? 1
  const leftRepetitions = dataConfig?.numRepetitionsForPlace('left') ?? 1
  const outerGridStyle = {
    gridTemplateColumns: `repeat(${bottomRepetitions}, 1fr)`,
    gridTemplateRows: `repeat(${leftRepetitions}, 1fr)`,
    height,
    left,
    top,
    width
  }
  const innerGridStyle = {
    gridTemplateColumns: `repeat(${xCats.length}, 1fr)`,
    gridTemplateRows: `repeat(${yCats.length}, 1fr)`,
  }

  for (let topIndex = 0; topIndex < bottomRepetitions; topIndex++) {
    for (let rightIndex = 0; rightIndex < leftRepetitions; rightIndex++) {
      const adornmentNodes = []
      for (let yIndex = 0; yIndex < yCats.length; yIndex++) {
        for (let xIndex = 0; xIndex < xCats.length; xIndex++) {
          let subPlotKey: Record<string, string> = {}
          if (topAttrId) {
            subPlotKey = updateSubPlotKey(subPlotKey, topAttrId, topCats[topIndex])
          }
          if (rightAttrId) {
            // invert the rightIndex to match how the graph's y axis is oriented
            const rightIndexInverted = leftRepetitions - rightIndex - 1
            subPlotKey = updateSubPlotKey(subPlotKey, rightAttrId, rightCats[rightIndexInverted])
          }
          if (yAttrId) {
            // invert the yIndex to match how the graph's y axis is oriented
            const yIndexInverted = yCats.length - yIndex - 1
            subPlotKey = updateSubPlotKey(subPlotKey, yAttrId, yCats[yIndexInverted])
          }
          if (xAttrId) {
            subPlotKey = updateSubPlotKey(subPlotKey, xAttrId, xCats[xIndex])
          }
          adornmentNodes.push(
            <div
              key={`${kGraphAdornmentsClass}-${yIndex}-${xIndex}-${rightIndex}-${topIndex}`}
              className={`${kGraphAdornmentsClass}__cell`}
              data-testid={`${kGraphAdornmentsClass}__cell`}
            >
              {
                adornments.map((adornment: IAdornmentModel) => {
                  // skip adornments that don't support current plot type
                  const adornmentContentInfo = getAdornmentContentInfo(adornment.type)
                  if (!adornmentContentInfo.plots.includes(graphModel.plotType)) return

                  return <Adornment
                          key={`graph-adornment-${adornment.id}-${yIndex}-${xIndex}-${rightIndex}-${topIndex}`}
                          adornment={adornment}
                          subPlotKey={subPlotKey}
                          topCats={topCats}
                          rightCats={rightCats}
                        />
                })
              }
            </div>
          )
        }
      }

      outerGridCells.push(
        <div className="innerGrid" key={`inner-grid-${topIndex}-${rightIndex}`} style={innerGridStyle}>
          {adornmentNodes}
        </div>
      )
    }
  }

  const containerClass = clsx(
    `${kGraphAdornmentsClass} ${instanceId}`,
    { 'tile-selected': isTileSelected() }
  )
  return (
    <div className={containerClass} data-testid={kGraphAdornmentsClass} style={outerGridStyle}>
      {outerGridCells}
    </div>
  )
})
