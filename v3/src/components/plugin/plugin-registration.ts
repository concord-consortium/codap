import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { ComponentTitleBar } from "../component-title-bar"
import PluginsIcon from '../../assets/icons/icon-plug.svg'
import { kPluginTileType } from "./plugin-defs"
import { PluginModel } from "./plugin-model"
import { PluginComponent } from "./plugin-component"

export const kPluginIdPrefix = "PLUG"

registerTileContentInfo({
  type: kPluginTileType,
  prefix: kPluginIdPrefix,
  modelClass: PluginModel,
  defaultContent: () => PluginModel.create()
})

registerTileComponentInfo({
  type: "CodapPlugin",
  TitleBar: ComponentTitleBar,
  Component: PluginComponent,
  tileEltClass: "codap-plugin",
  Icon: PluginsIcon,
  shelf: {
    position: 7,
    labelKey: "DG.ToolButtonData.pluginMenu.title",
    hintKey: "DG.ToolButtonData.pluginMenu.toolTip"
  },
  defaultWidth: 300,
  defaultHeight: 300
})
