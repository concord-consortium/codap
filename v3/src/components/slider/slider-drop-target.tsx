import { useDndContext, useDroppable } from "@dnd-kit/core"
import { clsx } from "clsx"
import { useMemo } from "react"
import { getDragAttributeInfo, useDropHandler } from "../../hooks/use-drag-drop"
import { ITileModel } from "../../models/tiles/tile-model"
import { t } from "../../utilities/translation/translate"
import { DropHint } from "../data-display/components/drop-hint"
import { configureSliderFromAttribute, isSliderAttributeDropAllowed } from "./slider-attribute-drop"
import { isSliderModel } from "./slider-model"

import "../data-display/components/droppable-svg.scss"

// Makes the element given `setNodeRef` accept numeric/date attribute drops that can configure the slider.
// That element should contain the slider's painted content, since drop collision detection prefers the
// droppable that contains the element under the pointer. The droppable is disabled for any other drag,
// so those drops pass through rather than selecting the slider.
export function useSliderAttributeDrop(instanceId: string, tile?: ITileModel) {
  const slider = tile && isSliderModel(tile.content) ? tile.content : undefined
  const dropId = `${instanceId}-slider-attribute-drop`
  const { active } = useDndContext()
  const { dataSet, attributeId } = getDragAttributeInfo(active) || {}
  // evaluated once per drag rather than on every render while dragging
  const isAllowed = useMemo(
    () => !!slider && isSliderAttributeDropAllowed(slider, dataSet, attributeId),
    [slider, dataSet, attributeId]
  )
  const { isOver, setNodeRef } = useDroppable({ id: dropId, disabled: !isAllowed })

  useDropHandler(dropId, dropped => {
    const info = getDragAttributeInfo(dropped)
    if (tile && slider && info?.dataSet && isSliderAttributeDropAllowed(slider, info.dataSet, info.attributeId)) {
      configureSliderFromAttribute(tile, info.dataSet, info.attributeId)
    }
  })

  const attrName = isAllowed && attributeId ? dataSet?.getAttribute(attributeId)?.name : undefined
  const hintKey = slider?.sliderType === "selection"
    ? "V3.Slider.dropHint.selection"
    : "V3.Slider.dropHint.visibility"
  const hintText = attrName ? t(hintKey, { vars: [attrName] }) : undefined

  return { setNodeRef, isAllowed, isOver: isAllowed && isOver, hintText }
}

interface IProps {
  isAllowed: boolean
  isOver: boolean
  hintText?: string
}

// Highlights the slider while an allowed attribute is dragged over it. The overlay has no pointer
// events, so it never interferes with the thumb or axis.
export function SliderDropHighlight({ isAllowed, isOver, hintText }: IProps) {
  return (
    <>
      <div className={clsx("droppable-svg", "slider-attribute-drop", { active: isAllowed, over: isOver })}/>
      <DropHint hintText={hintText} isVisible={isOver} />
    </>
  )
}
