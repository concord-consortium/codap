import {max, range} from "d3"
import {reaction} from "mobx"
import {onAction} from "mobx-state-tree"
import {useCallback, useEffect} from "react"
import {defaultDiameter, defaultRadius, transitionDuration} from "../graphing-types"
import { useGraphLayoutContext } from "../models/graph-layout"
import {getScreenCoord, setPointCoordinates} from "../utilities/graph_utils"
import {IDataSet} from "../../../data-model/data-set"
import {INumericAxisModel} from "../models/axis-model"
import { prf } from "../../../utilities/profiler"

export interface IUseDotPlotDots {
  axisModel: INumericAxisModel
  attributeID: string
  dataset?: IDataSet
  cases: string[]
  dotsRef: React.RefObject<SVGSVGElement>
  firstTime:  React.MutableRefObject<boolean>
}

export const useDotPlotDots = (props: IUseDotPlotDots) => {
  const {axisModel, attributeID, dataset, cases, dotsRef, firstTime} = props
  const layout = useGraphLayoutContext()
  const xScale = layout.axisScale(axisModel.place)
  const yScale = layout.axisScale("left")

  const refreshPoints = useCallback(()=> {
    const [rangeMin, rangeMax] = xScale?.range() || [],
      plotWidth = Math.abs(rangeMax ?? 0 - rangeMin ?? 0)

    function computeBinPlacements() {
      const numBins = Math.ceil(plotWidth / defaultDiameter) + 1,
        binWidth = plotWidth / (numBins - 1),
        bins: string[][] = range(numBins + 1).map(() => [])

      cases.forEach((anID) => {
        const numerator = xScale?.(dataset?.getNumeric(anID, attributeID) ?? -1),
          bin = Math.ceil((numerator ?? 0) / binWidth)
        if (bin >= 0 && bin <= numBins) {
          bins[bin].push(anID)
          binMap[anID] = {yIndex: bins[bin].length}
        }
      })
      const maxInBin = (max(bins, (b => b.length)) || 0) + 1,
        excessHeight = Math.max(0, maxInBin - Math.floor(yHeight / defaultDiameter)) * defaultDiameter
      overlap = excessHeight / maxInBin
    }

    const computeYCoord = (binContents: { yIndex: number }) => {
      return binContents ? yHeight - defaultRadius / 2 - binContents.yIndex * (defaultDiameter - overlap) : 0
    }

    const
      yHeight = Number(yScale?.range()[0]),
      binMap: { [id: string]: { yIndex: number } } = {}
    let overlap = 0
    computeBinPlacements()

    const getScreenX = (anID: string) => getScreenCoord(dataset, anID, attributeID, xScale),
      getScreenY = (anID: string) => computeYCoord(binMap[anID]),
      duration = firstTime.current ? transitionDuration : 0,
      onComplete = firstTime.current ? () => {
        prf.measure("Graph.refreshPoints[onComplete]", () => {
          firstTime.current = false
        })
      } : undefined

    setPointCoordinates({dotsRef, getScreenX, getScreenY, duration, onComplete})
  },[attributeID, cases, dataset, dotsRef, firstTime, xScale, yScale])

  useEffect( function pointsEffect() {
    refreshPoints()
    const disposer = reaction(()=>axisModel.domain, ()=>{
      refreshPoints()
    })
    const mstDisposer = dataset ? onAction(dataset, (action)=>{
      if( ['setValue', 'selectCases', 'setSelectedCases'].includes(action.name)) {
        refreshPoints()
      }
    }, true) : ()=>null
    return ()=> {
      disposer()
      mstDisposer()
    }
  },[refreshPoints, axisModel.domain, dataset])
}
