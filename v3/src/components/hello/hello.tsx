import React from "react"
import {Text} from "./text"
import Icon from "../../assets/concord.png"
import {useSampleText} from "../../hooks/use-sample-text"
import t from "../../utilities/translation/translate"
import build from "../../../build_number.json"
import pkg from "../../../package.json"

export const HelloComponent = () => {
  const sampleText = useSampleText()
  return (
    <div className="hello-codap3">
      <div className="version-build-number">
        <span>v{pkg.version}-build-{build.buildNumber}</span>
      </div>
      <div>
        <img src={Icon}/>
        <Text text={sampleText}/>
        <p>{t("V3.INTRO.DRAG.CSV")}</p>
      </div>
    </div>
  )
}
