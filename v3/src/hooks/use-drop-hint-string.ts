import {useState} from "react"
import {useDndContext, useDndMonitor} from "@dnd-kit/core"
import {useDataSetContext} from "./use-data-set-context"
import {getStringWithSwaps} from "../utilities/tokened-string"
import {IGraphModel} from "../components/graph/models/graph-model"
import {GraphAttrRole} from "../components/graph/models/data-configuration-model"

export interface IUseDropHintStringProps {
  graphModel: IGraphModel
}

export function determineBaseString(placeString: string,  dropType: string, existingType: string){
  const stringMap = {
    x: {
      numeric: {
        empty: "addToEmptyPlace",
        existing: "replaceAttribute"
      },
      categorical: {
        empty: "layoutPlotsSideBySide",
        existing: "layoutPlotsSideBySide"
      }
    },
    y: {
      numeric: {
        empty: "addToEmptyPlace",
        existing: "replaceAttribute"
      },
      categorical: {
        empty: "layoutPlotsVertically",
        existing: "layoutPlotsVertically"
      }
    },
    legend: {
      numeric: {
        empty: "dropInPlot",
        existing: "dropInPlot"
      },
      categorical: {
        empty: "dropInPlot",
        existing: "dropInPlot"
      }
    }
  }

  const placeParam = placeString as keyof typeof stringMap
  const typeParam = dropType as keyof typeof stringMap.x
  const containsParam = existingType === undefined ? "empty" : "existing"
  const stringKey = stringMap[placeParam][typeParam][containsParam]
  const baseString = `DG.GraphView.${stringKey}`
  return baseString
}

function getAttrRole(droppableInfoArr: string[]){
  const isPlot = droppableInfoArr.includes("plot"),
    isAxis = droppableInfoArr.includes("axis"),
    isLeft = isAxis && droppableInfoArr.includes("left"),
    foundRole = isPlot ? "legend" : isLeft ? "y" : "x"
  return foundRole as GraphAttrRole
}

export const useDropHintString = ({graphModel} : IUseDropHintStringProps) => {
  const dataSet = useDataSetContext(),
    [overId, setOverId] = useState<string>(""),
    { active } = useDndContext()

  useDndMonitor({
    onDragOver(event) {
      const newOverId = event.over?.id ? event.over.id : ''
      setOverId(newOverId as string)
    },
  })

  if (dataSet && active?.data.current ) {
    const droppingAttrId = active.data.current.attributeId,
      droppingAttrName = dataSet.attrFromID(droppingAttrId).name,
      droppingAttrType = dataSet.attrFromID(droppingAttrId).type as string

    const droppableInfoArr = (overId as string).split("-"),
      attrRole = getAttrRole(droppableInfoArr), // -> x | y | legend
      priorAttrId = graphModel.getAttributeID(attrRole),
      priorAttrName = dataSet?.attrFromID(priorAttrId)?.name as string,
      priorAttrType = dataSet?.attrFromID(priorAttrId)?.type as string,
      baseString = determineBaseString(attrRole, droppingAttrType, priorAttrType)

    const details = [droppingAttrName]
    if (priorAttrName && droppingAttrType !== "categorical"){
      details.unshift(priorAttrName)
    }

    return getStringWithSwaps(baseString, "%@", details)
  }
}
