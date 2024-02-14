import React from "react"
import { t } from "../../../utilities/translation/translate"
import { ComponentTitleBar } from "../../component-title-bar"
import { observer } from "mobx-react-lite"
import { ITileTitleBarProps } from "../../tiles/tile-base-props"

export const MapComponentTitleBar = observer(function MapComponentTitleBar(props: ITileTitleBarProps) {
  const {tile, ...others} = props
  const getTitle = () => tile?.title || t("DG.DocumentController.mapTitle")

  return (
    <ComponentTitleBar tile={tile} getTitle={getTitle} {...others} />
  )
})
