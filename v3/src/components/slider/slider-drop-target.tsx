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

// Accepts numeric/date attribute drops that can configure the slider. `setOverlayRef` goes on an element
// containing the slider's painted content: drop collision detection finds the tile under the pointer by
// that element, then applies the slider's registered detection to the attribute droppable, which is the
// highlight. The attribute droppable is disabled for any other drag, so such drops do nothing.
export function useSliderAttributeDrop(instanceId: string, tile?: ITileModel) {
  const slider = tile && isSliderModel(tile.content) ? tile.content : undefined
  const dropId = `${instanceId}-slider-attribute-drop`
  const { setNodeRef: setOverlayRef } = useDroppable({ id: `${instanceId}-component-drop-overlay` })
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

  return { setOverlayRef, setNodeRef, isAllowed, isOver: isAllowed && isOver, hintText }
}

interface IProps {
  setNodeRef: (elt: HTMLElement | null) => void
  isAllowed: boolean
  isOver: boolean
  hintText?: string
}

// The attribute droppable, which covers the slider and highlights it while an allowed attribute is dragged
// over it. It has no pointer events, so it never interferes with the thumb or axis.
export function SliderDropHighlight({ setNodeRef, isAllowed, isOver, hintText }: IProps) {
  const classes = clsx("droppable-svg", "slider-attribute-drop", { active: isAllowed, over: isOver })
  return (
    <>
      <div ref={setNodeRef} className={classes}/>
      <DropHint hintText={hintText} isVisible={isOver} />
    </>
  )
}
