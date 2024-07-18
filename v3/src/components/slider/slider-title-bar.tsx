import { addDisposer } from "mobx-state-tree"
import React, { useCallback } from "react"
import { observer } from "mobx-react-lite"
import { ComponentTitleBar  } from "../component-title-bar"
import { isAliveSafe } from "../../utilities/mst-utils"
import { ITileTitleBarProps } from "../tiles/tile-base-props"
import { isSliderModel } from "./slider-model"
import { getTileContentInfo } from "../../models/tiles/tile-content-info"

export const SliderTitleBar = observer(function SliderTitleBar({ tile, onCloseTile, ...others }: ITileTitleBarProps) {
  const { content } = tile || {}
  const tileContentInfo = getTileContentInfo(tile?.content.type)
  const getTitle = () => {
    return tile && tileContentInfo?.getTitle ? tileContentInfo.getTitle(tile) : undefined
  }

  const handleCloseTile = useCallback((tileId: string) => {
    const sliderModel = isAliveSafe(content) && isSliderModel(content) ? content : undefined
    // when tile is closed by user, destroy the underlying global value as well
    sliderModel && addDisposer(sliderModel, () => sliderModel.destroyGlobalValue())
    onCloseTile?.(tileId)
  }, [content, onCloseTile])

  return (
    <ComponentTitleBar tile={tile} getTitle={getTitle} onCloseTile={handleCloseTile} {...others} />
  )
})
