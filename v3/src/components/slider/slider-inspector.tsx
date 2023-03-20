import React, { useEffect, useRef, useState } from "react"
import { InspectorButton, InspectorPanel } from "../inspector-panel"
import ValuesIcon from "../../assets/icons/icon-values.svg"
import { SliderSettingsPalette } from "./inspector-panel/slider-settings-panel"
import t from "../../utilities/translation/translate"
import { useDndContext } from "@dnd-kit/core"
import { ITileInspectorPanelProps } from "../tiles/tile-base-props"

export const SliderInspector = ({ tile, show }: ITileInspectorPanelProps) => {
  const [showPalette, setShowPalette] = useState<string | undefined>(undefined)
  const panelRef = useRef<HTMLDivElement>()
  const panelRect = panelRef.current?.getBoundingClientRect()
  const buttonRef = useRef<HTMLDivElement>()
  const buttonRect = buttonRef.current?.getBoundingClientRect()
  const {active} = useDndContext()

  useEffect(()=>{
    !show && setShowPalette(undefined)
  }, [active, show])

  const handleRulerButton = () => {
    setShowPalette(showPalette === "measure" ? undefined : "measure")
  }

  const setButtonRef = (ref: any) => {
    buttonRef.current = ref.current
  }

  return (
    <InspectorPanel component="slider" show={show}>
      <InspectorButton tooltip={t("DG.Inspector.displayValues.toolTip")} showMoreOptions={true}
        onButtonClick={handleRulerButton} setButtonRef={setButtonRef} testId={"slider-values-button"}>
        <ValuesIcon />
      </InspectorButton>
      {showPalette === "measure" &&
        <SliderSettingsPalette tile={tile} setShowPalette={setShowPalette}
          panelRect={panelRect} buttonRect={buttonRect}/>}
    </InspectorPanel>
  )
}
