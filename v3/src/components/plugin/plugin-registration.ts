import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
// import { registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { PlaceholderTileComponent } from "../tiles/placeholder/placeholder-tile"
import { ComponentTitleBar } from "../component-title-bar"
import { ToolshelfButton } from "../tool-shelf/tool-shelf"
import PluginsIcon from '../../assets/icons/icon-plug.svg'

export const kPluginIdPrefix = "PLIN"

// registerTileContentInfo({
//   type: "CodapPlugin",
//   prefix: kPluginIdPrefix,
//   modelClass: PluginModel,
//   defaultContent: () => createPluginModel()
// })

registerTileComponentInfo({
  type: "CodapPlugin",
  TitleBar: ComponentTitleBar,
  Component: PlaceholderTileComponent,
  tileEltClass: "codap-plugin",
  Icon: PluginsIcon,
  ComponentToolshelfButton: ToolshelfButton,
  position: 7,
  toolshelfButtonOptions: {iconLabel: "DG.ToolButtonData.pluginMenu.title",
                            buttonHint: "DG.ToolButtonData.pluginMenu.toolTip"},
  defaultWidth: 300,
  defaultHeight: 300
})
