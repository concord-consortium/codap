/**
 * Graph Custom Hooks
 */
import {extent, ScaleLinear} from "d3"
import {useEffect} from "react"
import {IAttribute} from "../../../data-model/attribute"
import {DataBroker} from "../../../data-model/data-broker"
import {idData} from "../graphing-types"
import {autorun} from "mobx"

interface IDragHandlers {
  start: (event: MouseEvent) => void
  drag: (event: MouseEvent) => void
  end: (event: MouseEvent) => void
}
export const useDragHandlers = (target: any, { start, drag, end }: IDragHandlers) => {
  useEffect(() => {
    target.addEventListener('mousedown', start)
    target.addEventListener('mousemove', drag)
    target.addEventListener('mouseup', end)
    // On cleanup, remove event listeners
    return () => {
      target.removeEventListener('mousedown', start)
      target.removeEventListener('mousemove', drag)
      target.removeEventListener('mouseup', end)
    }
  }, [target, start, drag, end])
}

export interface IUseGetDataProps {
  broker: DataBroker,
  dataRef: React.MutableRefObject<idData[]>,
  xNameRef: React.MutableRefObject<string>,
  yNameRef: React.MutableRefObject<string>,
  xAxis: ScaleLinear<number, number, never>,
  yAxis: ScaleLinear<number, number, never>,
  setCounter: any
}

export const useGetData = (props: IUseGetDataProps) => {
  const {broker, dataRef, xNameRef, yNameRef, xAxis, yAxis, setCounter} = props

  const findNumericAttrIndices = (attrsToSearch: IAttribute[]): { xAttrIndex: number, yAttrIndex: number } => {
    const result = {xAttrIndex: -1, yAttrIndex: -1}
    let index = 0
    while (result.yAttrIndex < 0 && index < attrsToSearch.length) {
      const foundNumeric = attrsToSearch[index].numValues.find(value=>isFinite(value))
      if( foundNumeric) {
        if(result.xAttrIndex < 0) {
          result.xAttrIndex = index
        }
        else {
          result.yAttrIndex = index
        }
      }
      index++
    }
    return result
  }

  useEffect(() => {
    if (broker?.last) {
      const dataSet = broker?.last,
        attributes = dataSet?.attributes,
        {xAttrIndex, yAttrIndex} = findNumericAttrIndices(attributes || []),
        xAttribute = attributes?.[xAttrIndex],
        yAttribute = attributes?.[yAttrIndex],
        cases = dataSet?.cases,
        xValues:number[] = [],
        yValues:number[] = []
      dataRef.current.length = 0
      if( cases.length > 0) {
        cases.forEach(aCase => {
          dataRef.current.push({
            id: aCase.__id__,
          })
          xValues.push(Number(dataSet.getNumeric(aCase.__id__, xAttribute.id)))
          yValues.push(Number(dataSet.getNumeric(aCase.__id__, yAttribute.id)))
        })
        xNameRef.current = xAttribute?.name || ''
        yNameRef.current = yAttribute?.name || ''
        if (dataRef.current.length > 0) {
          xAxis.domain(extent(xValues, d => d) as [number, number]).nice()
          yAxis.domain(extent(yValues, d => d) as [number, number]).nice()
        }
      }
      setCounter((prevCounter: number) => ++prevCounter)
    }
  }, [broker?.last, dataRef, setCounter, xAxis, yAxis, xNameRef, yNameRef])

}
