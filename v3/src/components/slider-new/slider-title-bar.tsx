import { addDisposer } from "mobx-state-tree"
import { useCallback } from "react"
import { observer } from "mobx-react-lite"
import { ComponentTitleBar  } from "../component-title-bar"
import { isAliveSafe } from "../../utilities/mst-utils"
import { ITileTitleBarProps } from "../tiles/tile-base-props"
import { isSliderModel } from "./slider-model"

export const SliderTitleBar = observer(function SliderTitleBar({ tile, onCloseTile, ...others }: ITileTitleBarProps) {
  const { content } = tile || {}

  const handleCloseTile = useCallback((tileId: string) => {
    const sliderModel = isAliveSafe(content) && isSliderModel(content) ? content : undefined
    // when tile is closed by user, destroy the underlying global value as well
    sliderModel && addDisposer(sliderModel, () => sliderModel.destroyGlobalValue())
    onCloseTile?.(tileId)
  }, [content, onCloseTile])

  return (
    <ComponentTitleBar tile={tile} onCloseTile={handleCloseTile} {...others} />
  )
})
