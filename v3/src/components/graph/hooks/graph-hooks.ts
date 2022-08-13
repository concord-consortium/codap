/**
 * Graph Custom Hooks
 */
import {extent} from "d3"
import {useContext, useEffect, useMemo} from "react"
import {IAttribute} from "../../../data-model/attribute"
import {DataBroker} from "../../../data-model/data-broker"
import { INumericAxisModel } from "../models/axis-model"
import { GraphLayoutContext } from "../models/graph-layout"
import {InternalizedData} from "../graphing-types"

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
  broker?: DataBroker
  xAxis: INumericAxisModel
  yAxis: INumericAxisModel
}
export const useGetData = (props: IUseGetDataProps) => {
  const {broker, xAxis, yAxis} = props,
    layout = useContext(GraphLayoutContext),
    xScale = layout.axisScale("bottom"),
    yScale = layout.axisScale("left")

  const result = useMemo(() => {
    let xAttrId= '', yAttrId = '', xName = '', yName = ''
    const data: InternalizedData = {
      xAttributeID: '',
      yAttributeID: '',
      cases: []
    }

    const findNumericAttrIds = (attrsToSearch: IAttribute[]) => {
      for (const iAttr of attrsToSearch) {
        if (iAttr.type === 'numeric') {
          if (xAttrId === '') {
            xAttrId = iAttr.id
          } else if (yAttrId === '') {
            yAttrId = iAttr.id
          } else {
            break
          }
        }
      }
    }

    if (broker?.last) {
      const worldDataSet = broker?.last,
        attributes = worldDataSet?.attributes

      findNumericAttrIds(attributes || [])
      if (xAttrId === '' || yAttrId === '') {
        return { xName, yName, data }
      }

      const xValues = worldDataSet.attrFromID(xAttrId).numValues,
        yValues = worldDataSet.attrFromID(yAttrId).numValues
      data.xAttributeID = xAttrId
      data.yAttributeID = yAttrId
      xName = broker?.last?.attrFromID(data.xAttributeID)?.name || ''
      yName = broker?.last?.attrFromID(data.yAttributeID)?.name || ''
      data.cases = worldDataSet.cases.map(aCase => aCase.__id__)
        .filter(anID => {
          return isFinite(Number(worldDataSet?.getNumeric(anID, xAttrId))) &&
            isFinite(Number(worldDataSet?.getNumeric(anID, yAttrId)))
        })
      if (data.cases.length > 0) {
        xScale.domain(extent(xValues, d => d) as [number, number]).nice()
        const [xMin, xMax] = xScale.domain()
        xAxis.setDomain(xMin, xMax)

        yScale.domain(extent(yValues, d => d) as [number, number]).nice()
        const [yMin, yMax] = yScale.domain()
        yAxis.setDomain(yMin, yMax)
      }
    }
    return { xName, yName, data }
  }, [broker?.last, xAxis, xScale, yAxis, yScale])

  return result
}
