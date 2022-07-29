import React from "react"
import {idData, Rect} from "../graphing-types"
import {between} from "./math_utils"

/**
 * Utility routines having to do with data
 */

export function selectCasesInWorldRect(iData:idData[], iWorldRect:Rect) {
  const tRight = iWorldRect.x + iWorldRect.width,
    tBottom = iWorldRect.y - iWorldRect.height
  return iData.map((d)=>{
    d.selected = between(d.x, iWorldRect.x, tRight) && (d.y !== undefined ? between(d.y, tBottom, iWorldRect.y) : false)
    return d
  })
}

export function clearSelection(iData:idData[], setHighlightCounter:React.Dispatch<React.SetStateAction<number>>) {
  let changedSelection = false
  iData.forEach((d)=>{
    if( d.selected) {
      d.selected = false
      changedSelection = true
    }
  })
  if (changedSelection) {
    setHighlightCounter(prevCounter => ++prevCounter)
  }
  return iData
}

export function selectCasesWithIDs(iData:idData[], ids:string[]) {
  iData.forEach((d)=>{
    d.selected = ids.includes(d.id)
  })
  return iData
}
