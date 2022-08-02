/**
 * Graph Custom Hooks
 */
import {extent, ScaleLinear} from "d3"
import {useEffect} from "react"
import {IAttribute} from "../../../data-model/attribute"
import {DataBroker} from "../../../data-model/data-broker"
import {InternalizedData} from "../graphing-types"
import {autorun} from "mobx"
import {IDataSet} from "../../../data-model/data-set"

interface IDragHandlers {
  start: (event: MouseEvent) => void
  drag: (event: MouseEvent) => void
  end: (event: MouseEvent) => void
}

export const useDragHandlers = (target: any, {start, drag, end}: IDragHandlers) => {
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
  dataRef: React.MutableRefObject<InternalizedData>,
  xNameRef: React.MutableRefObject<string>,
  yNameRef: React.MutableRefObject<string>,
  xAxis: ScaleLinear<number, number>,
  yAxis: ScaleLinear<number, number>,
  setCounter: any
}

export const useGetData = (props: IUseGetDataProps) => {
  const {broker, dataRef, xNameRef, yNameRef, xAxis, yAxis, setCounter} = props

  const findNumericAttrIds = (attrsToSearch: IAttribute[]): { xAttrId: string, yAttrId: string } => {
    const result = {xAttrId: '', yAttrId: ''}
    for (const iAttr of attrsToSearch) {
      if (iAttr.type === 'numeric') {
        if (result.xAttrId === '') {
          result.xAttrId = iAttr.id
        } else if (result.yAttrId === '') {
          result.yAttrId = iAttr.id
        } else {
          break
        }
      }
    }
    return result
  }

  useEffect(() => {
    if (broker?.last) {
      const dataSet = broker?.last,
        attributes = dataSet?.attributes,
        {xAttrId, yAttrId} = findNumericAttrIds(attributes || []),
        xValues = dataSet.attrFromID(xAttrId).numValues,
        yValues = dataSet.attrFromID(yAttrId).numValues
      dataRef.current.xAttributeID = xAttrId
      dataRef.current.yAttributeID = yAttrId
      dataRef.current.cases = dataSet.cases.map(aCase=>aCase.__id__)
      xNameRef.current = dataSet.attrFromID(xAttrId).name || ''
      yNameRef.current = dataSet.attrFromID(yAttrId).name || ''
      if (dataRef.current.cases.length > 0) {
        xAxis.domain(extent(xValues, d => d) as [number, number]).nice()
        yAxis.domain(extent(yValues, d => d) as [number, number]).nice()
      }
      setCounter((prevCounter: number) => ++prevCounter)
      // console.log('dataRef.current =', dataRef.current)
    }
  }, [broker?.last, dataRef, setCounter, xAxis, yAxis, xNameRef, yNameRef])

}

export const useSelection =(dataSet: IDataSet | undefined,
                            setRefreshCounter: React.Dispatch<React.SetStateAction<number>>) =>
{
  useEffect(() => {
    const disposer = autorun(() => {
      dataSet?.selection.forEach(() => {/* just chillin... */
      })
      setRefreshCounter(count => ++count)
    })
    return () => disposer()
  }, [dataSet?.selection, setRefreshCounter])
}

