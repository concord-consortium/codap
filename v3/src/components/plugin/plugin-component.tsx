import React from "react"
import { ITileBaseProps } from "../tiles/tile-base-props"
import { isPluginModel } from "./plugin-model"

import "./plugin.scss"

export const PluginComponent = ({ tile }: ITileBaseProps) => {
  const pluginModel = tile?.content
  if (!isPluginModel(pluginModel)) return null

  return (
    <div className="codap-plugin" data-testid="codap-plugin">
      <iframe className="codap-plugin-iframe" src={pluginModel.url} />
    </div>
  )
}
