import React from "react"
import {Text} from "./text"
import Icon from "../../assets/concord.png"
import {useSampleText} from "../../hooks/use-sample-text"
import t from "../../utilities/translation/translate"
import { ITileBaseProps } from "../tiles/tile-base-props"
import { isHelloCodapModel } from "./hello-model"

export const HelloComponent = ({ tile }: ITileBaseProps) => {
  const sampleText = useSampleText()
  const helloModel = tile?.content
  if (!isHelloCodapModel(helloModel)) return null

  return (
    <div className="hello-codap3">
      <div>
        <img src={Icon}/>
        <Text text={sampleText}/>
        <p>{t("V3.INTRO.DRAG.CSV")}</p>
      </div>
    </div>
  )
}
