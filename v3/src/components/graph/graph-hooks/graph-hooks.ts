/**
 * Graph Custom Hooks
 */
import {extent, ScaleLinear} from "d3"
import {autorun} from "mobx"
import React, {useEffect} from "react"
import {IAttribute} from "../../../data-model/attribute"
import {DataBroker} from "../../../data-model/data-broker"
import {InternalizedData} from "../graphing-types"
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
  broker?: DataBroker,
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
      const worldDataSet = broker?.last,
        attributes = worldDataSet?.attributes,
        {xAttrId, yAttrId} = findNumericAttrIds(attributes || [])
      if (xAttrId === '' || yAttrId === '') {
        return
      }
      const xValues = worldDataSet.attrFromID(xAttrId).numValues,
        yValues = worldDataSet.attrFromID(yAttrId).numValues
      dataRef.current.xAttributeID = xAttrId
      dataRef.current.yAttributeID = yAttrId
      dataRef.current.cases = worldDataSet.cases.map(aCase => aCase.__id__)
        .filter(anID => {
          return isFinite(Number(worldDataSet?.getNumeric(anID, xAttrId))) &&
            isFinite(Number(worldDataSet?.getNumeric(anID, yAttrId)))
        })
      xNameRef.current = worldDataSet.attrFromID(xAttrId).name || ''
      yNameRef.current = worldDataSet.attrFromID(yAttrId).name || ''
      if (dataRef.current.cases.length > 0) {
        xAxis.domain(extent(xValues, d => d) as [number, number]).nice()
        yAxis.domain(extent(yValues, d => d) as [number, number]).nice()
      }
      setCounter((prevCounter: number) => ++prevCounter)
    }
  }, [broker?.last, dataRef, setCounter, xAxis, yAxis, xNameRef, yNameRef])

}

export const useSelection = (worldDataRef: React.MutableRefObject<IDataSet | undefined>,
                             setRefreshCounter: React.Dispatch<React.SetStateAction<number>>) => {
  useEffect(() => {
    const disposer = autorun(() => {
      worldDataRef.current?.selection.forEach(() => {/* just chillin... */
      })
      setRefreshCounter(count => ++count)
    })
    return () => disposer()
  }, [worldDataRef, worldDataRef.current?.selection, setRefreshCounter])
}

