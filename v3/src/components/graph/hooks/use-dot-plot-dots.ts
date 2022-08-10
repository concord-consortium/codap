import {defaultDiameter, defaultRadius} from "../graphing-types"
import {max, range, ScaleLinear} from "d3"
import {getScreenCoord, setPointCoordinates} from "../utilities/graph_utils"
import {IDataSet} from "../../../data-model/data-set"
import {useCallback, useEffect} from "react"
import {reaction} from "mobx"
import {INumericAxisModel} from "../models/axis-model"
import {onAction} from "mobx-state-tree"

export interface IUseDotPlotDots {
  axisModel: INumericAxisModel
  attributeID: string
  xScale?: ScaleLinear<number, number>
  yScale?: ScaleLinear<number, number>
  dataset?: IDataSet
  cases: string[]
  dotsRef: React.RefObject<SVGSVGElement>
  firstTime: [boolean | null, React.Dispatch<React.SetStateAction<boolean | null>>]
}


export const useDotPlotDots = (props: IUseDotPlotDots) => {
  const {axisModel, attributeID, xScale, yScale, dataset, cases, dotsRef, firstTime: [firstTime, setFirstTime]} = props

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
      getScreenY = (anID: string) => computeYCoord(binMap[anID])

    setPointCoordinates({dotsRef, dataset, firstTime, setFirstTime, getScreenX, getScreenY})
  },[attributeID, cases, dataset, dotsRef, firstTime, setFirstTime, xScale, yScale])

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

