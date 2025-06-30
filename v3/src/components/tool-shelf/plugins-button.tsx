import React from "react"
import { Menu, MenuButton, MenuDivider, MenuItem, MenuList } from "@chakra-ui/react"
import PluginsIcon from '../../assets/icons/icon-plug.svg'
import { kRootPluginsUrl } from "../../constants"
import { useRemotePluginsConfig } from "../../hooks/use-remote-plugins-config"
import { useDocumentContent } from "../../hooks/use-document-content"
import { DEBUG_PLUGINS } from "../../lib/debug"
import { t } from "../../utilities/translation/translate"
import { kWebViewTileType } from "../web-view/web-view-defs"
import { isWebViewModel } from "../web-view/web-view-model"
import { processWebViewUrl } from "../web-view/web-view-utils"
import { ToolShelfButtonTag } from "./tool-shelf-button"
import { PluginData, PluginMenuConfig } from "./plugin-config-types"
import { logMessageWithReplacement } from "../../lib/log-message"
import _debugPlugins from "./debug-plugins.json"
import _standardPlugins from "./standard-plugins.json"
const debugPlugins = DEBUG_PLUGINS ? _debugPlugins as PluginMenuConfig : []
const standardPlugins = _standardPlugins as PluginMenuConfig
const combinedPlugins = [...standardPlugins, ...debugPlugins]

import "./plugins-button.scss"

interface IPluginItemProps {
  pluginData: PluginData | null
}
function PluginItem({ pluginData }: IPluginItemProps) {
  const documentContent = useDocumentContent()

  function handleClick() {
    if (!pluginData) return
    documentContent?.applyModelChange(
      () => {
        const url = URL.canParse(pluginData.path)
                      ? pluginData.path
                      : processWebViewUrl(`${kRootPluginsUrl}${pluginData.path}`)
        const options = { height: pluginData.height, width: pluginData.width }
        const tile = documentContent?.createOrShowTile?.(kWebViewTileType, options)
        if (isWebViewModel(tile?.content)) tile.content.setUrl(url)
      }, {
        undoStringKey: t("V3.Undo.plugin.create", { vars: [pluginData.title] }),
        redoStringKey: t("V3.Redo.plugin.create", { vars: [pluginData.title] }),
        log: logMessageWithReplacement("Add Plugin: %@", { name: pluginData.title, url: pluginData.path })

      }
    )
  }

  return pluginData ? (
    <MenuItem
      data-testid="tool-shelf-plugins-option"
      onClick={handleClick}
    >
      <div className="plugin-selection">
        <img className="plugin-selection-icon" src={`${kRootPluginsUrl}${pluginData.icon}`} />
        <span className="plugin-selection-title">{pluginData.title}</span>
      </div>
    </MenuItem>
  ) : <MenuDivider/>
}

export function PluginsButton() {
  const { plugins: remotePlugins } = useRemotePluginsConfig()
  const pluginItems: Array<PluginData | null> =
          remotePlugins.length ? [...combinedPlugins, null, ...remotePlugins] : combinedPlugins

  return (
    <Menu isLazy>
      <MenuButton
        className="tool-shelf-button plugins"
        title={t("DG.ToolButtonData.optionMenu.toolTip")}
        data-testid="tool-shelf-button-plugins"
      >
        <PluginsIcon />
        <ToolShelfButtonTag className="plugins" label={t("DG.ToolButtonData.pluginMenu.title")} />
      </MenuButton>
      <MenuList>
        {
          pluginItems.length
            ? pluginItems.map((pd, i) => <PluginItem key={pd?.title ?? `divider-${i}`} pluginData={pd} />)
            : <MenuItem>{t("V3.ToolButtonData.pluginMenu.fetchError")}</MenuItem>
        }
      </MenuList>
    </Menu>
  )
}
