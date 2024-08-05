import React from "react"
import { Menu, MenuButton, MenuItem, MenuList } from "@chakra-ui/react"
import PluginsIcon from '../../assets/icons/icon-plug.svg'
import { PluginData, useStandardPlugins } from "../../hooks/use-standard-plugins"
import { useDocumentContent } from "../../hooks/use-document-content"
import { t } from "../../utilities/translation/translate"
import { kWebViewTileType } from "../web-view/web-view-defs"
import { IWebViewModel } from "../web-view/web-view-model"
import { kRootPluginUrl, processPluginUrl } from "../web-view/web-view-utils"
import { ToolShelfButtonTag } from "./tool-shelf-button"

import "./plugins-button.scss"

interface IPluginItemProps {
  pluginData: PluginData
}
function PluginItem({ pluginData }: IPluginItemProps) {
  const documentContent = useDocumentContent()

  function handleClick() {
    documentContent?.applyModelChange(
      () => {
        const baseUrl = `${kRootPluginUrl}${pluginData.path}`
        const url = processPluginUrl(baseUrl)
        const options = { height: pluginData.height, width: pluginData.width }
        const tile = documentContent?.createOrShowTile?.(kWebViewTileType, options)
        if (tile) (tile.content as IWebViewModel).setUrl(url)
      }, {
        undoStringKey: t("V3.Undo.plugin.create", { vars: [pluginData.title] }),
        redoStringKey: t("V3.Redo.plugin.create", { vars: [pluginData.title] })
      }
    )
  }

  return (
    <MenuItem
      data-testid="tool-shelf-plugins-option"
      onClick={handleClick}
    >
      <div className="plugin-selection">
        <img className="plugin-selection-icon" src={`${kRootPluginUrl}${pluginData.icon}`} />
        <span className="plugin-selection-title">{pluginData.title}</span>
      </div>
    </MenuItem>
  )
}

export function PluginsButton() {
  const { plugins } = useStandardPlugins()

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
          plugins.length
            ? plugins.map(pd => <PluginItem key={pd.title} pluginData={pd} />)
            : <MenuItem>{t("V3.ToolButtonData.pluginMenu.fetchError")}</MenuItem>
        }
      </MenuList>
    </Menu>
  )
}
