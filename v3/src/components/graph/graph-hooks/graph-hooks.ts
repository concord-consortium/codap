/**
 * Graph Custom Hooks
 */
import {useEffect} from "react"
import {DataBroker} from "../../../data-model/data-broker"
import {worldData} from "../graphing-types"
import {extent, ScaleLinear} from "d3"
import {IAttribute} from "../../../data-model/attribute"

export const useAddListeners = (target: any, callbacks: {
  dragStart: (event: MouseEvent) => void,
  drag: (event: MouseEvent) => void,
  end: (event: MouseEvent) => void
}) => {
  useEffect(() => {
    target.addEventListener('mousedown', callbacks.dragStart)
    target.addEventListener('mousemove', callbacks.drag)
    target.addEventListener('mouseup', callbacks.end)
    // On cleanup, remove event listeners
    return () => {
      target.removeEventListener('mousedown', callbacks.dragStart)
      target.removeEventListener('mousemove', callbacks.drag)
      target.removeEventListener('mouseup', callbacks.end)
    }
  }, [target, callbacks.dragStart, callbacks.drag, callbacks.end])
}

export const useGetData = (broker: DataBroker, dataRef: React.MutableRefObject<worldData[]>,
                           xNameRef: React.MutableRefObject<string>, yNameRef: React.MutableRefObject<string>,
                           xAxis: ScaleLinear<number, number, never>, yAxis: ScaleLinear<number, number, never>,
                           setCounter: any) => {

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
        xValues = xAttribute?.numValues,
        yAttribute = attributes?.[yAttrIndex],
        yValues = yAttribute?.numValues
      dataRef.current.length = 0
      xValues?.forEach((aValue, index) => {
        dataRef.current.push({
          x: aValue,
          y: yValues?.[index] || 0,
          id: index,
          selected: false
        })
      })
      xNameRef.current = xAttribute?.name || ''
      yNameRef.current = yAttribute?.name || ''
      if (dataRef.current.length > 0) {
        xAxis.domain(extent(dataRef.current, d => d.x) as [number, number]).nice()
        yAxis.domain(extent(dataRef.current, d => d.y) as [number, number]).nice()
      }
      setCounter((prevCounter: number) => ++prevCounter)
    }
  }, [broker?.last, dataRef, setCounter, xAxis, yAxis, xNameRef, yNameRef])
}

