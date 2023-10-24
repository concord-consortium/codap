import {useDndContext} from "@dnd-kit/core"
import { AttributeType } from "../models/data/attribute"
import {getDragAttributeInfo} from "./use-drag-drop"
import {useGraphDataConfigurationContext} from "../components/graph/hooks/use-data-configuration-context"
import {attrRoleToGraphPlace, GraphAttrRole} from "../components/graph/graphing-types"
import {GraphPlace} from "../components/axis-graph-shared"
import t from "../utilities/translation/translate"

export interface IUseDropHintStringProps {
  role: GraphAttrRole
}

interface HintMapEntry {
  empty: string
  existing: string
}
type HintMap = Partial<Record<GraphAttrRole, Partial<Record<AttributeType, HintMapEntry>>>>

export function determineBaseString(role: GraphAttrRole, dropType?: AttributeType, priorType?: AttributeType) {
  const stringMap: HintMap = {
    x: {
      numeric: {
        empty: "addToEmptyX",
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
    },
    yPlus: {
      numeric: {
        empty: "addAttribute",
        existing: "addAttribute"
      }
    },
    rightNumeric: {
      numeric: {
        empty: "addAttribute",
        existing: "replaceAttribute"
      }
    },
    topSplit: {
      categorical: {
        empty: "layoutPlotsSideBySide",
        existing: "layoutPlotsSideBySide"
      }
    },
    rightSplit: {
      categorical: {
        empty: "layoutPlotsVertically",
        existing: "layoutPlotsVertically"
      }
    }
  }

  const stringKey = dropType && stringMap[role]?.[dropType]?.[priorType ? "existing" : "empty"]
  return stringKey ? `DG.GraphView.${stringKey}` : undefined
}

export const useDropHintString = ({role} : IUseDropHintStringProps) => {
  const dataConfig = useGraphDataConfigurationContext(),
    { active } = useDndContext(),
    { attributeId: dragAttrId = "", dataSet } = getDragAttributeInfo(active) || {},
    place = attrRoleToGraphPlace[role] as GraphPlace,
    dropAllowed = dataConfig?.graphPlaceCanAcceptAttributeIDDrop(place, dataSet, dragAttrId)

  if (dataSet && active?.data.current && dropAllowed) {
    const dragAttrName = dragAttrId ? dataSet.attrFromID(dragAttrId)?.name : undefined,
      dragAttrType = dragAttrId ? dataSet.attrFromID(dragAttrId)?.type : undefined

    const
      priorAttrId = dataConfig?.attributeID(role),
      priorAttrName = priorAttrId ? dataSet?.attrFromID(priorAttrId)?.name : undefined,
      priorAttrType = priorAttrId ? dataSet?.attrFromID(priorAttrId)?.type : undefined,
      baseString = determineBaseString(role, dragAttrType, priorAttrType)

    const details = [dragAttrName]
    if (priorAttrName && dragAttrType !== "categorical") {
      details.unshift(priorAttrName)
    }

    return baseString ? t(baseString, { vars: details }) : undefined
  }
}
