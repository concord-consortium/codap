import React, { useState } from "react"
import { Menu, MenuButton, MenuItem, MenuList } from "@chakra-ui/react"
import "../../utilities/plugin-icons"
import PluginsIcon from '../../assets/icons/icon-plugins.svg'
import { kRootPluginsUrl } from "../../constants"
import { useRemotePluginsConfig } from "../../hooks/use-remote-plugins-config"
import { useDocumentContent } from "../../hooks/use-document-content"
import { DEBUG_PLUGINS } from "../../lib/debug"
import { t } from "../../utilities/translation/translate"
import { kWebViewTileType } from "../web-view/web-view-defs"
import { isWebViewModel } from "../web-view/web-view-model"
import { processWebViewUrl } from "../web-view/web-view-utils"
import { ToolShelfButtonTag } from "./tool-shelf-button"
import { PluginData, PluginMenuConfig, PluginSubMenuItems } from "./plugin-config-types"
import { logMessageWithReplacement } from "../../lib/log-message"
import _debugPlugins from "./debug-plugins.json"
import _standardPlugins from "./standard-plugins.json"
const debugPlugins = DEBUG_PLUGINS ? _debugPlugins as PluginMenuConfig : []
const standardPlugins = _standardPlugins as PluginMenuConfig
const combinedPlugins = [...standardPlugins, ...debugPlugins]
import RightArrow from "../../assets/icons/arrow-right.svg"

import "./plugins-button.scss"
import "./tool-shelf.scss"

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

  const isStandardPlugin = standardPlugins.some(category =>
    category.subMenu.some(item => item?.title === pluginData?.title)
  )
  return (
    pluginData &&
      <MenuItem className="tool-shelf-menu-item plugin-selection" data-testid="tool-shelf-plugins-option" onClick={handleClick}>
        <img className="plugin-icon"
              src={`${isStandardPlugin ? "" : kRootPluginsUrl}${pluginData.icon}`} />
        <span className="plugin-selection-title">{pluginData.title}</span>
      </MenuItem>
  )
}

export function PluginsButton() {
  const { plugins: remotePlugins } = useRemotePluginsConfig()
  const pluginItems: (PluginSubMenuItems | null)[] =
          remotePlugins.length ? [...combinedPlugins, null, ...remotePlugins] : combinedPlugins
  const [selectedCategoryTitle, setSelectedCategoryTitle] = useState<string | null>(null)

  const renderPluginCategoryList = () => {
    if (!pluginItems.length) return null
    return (
      pluginItems.map((pluginData: PluginSubMenuItems | null) => {
        if (!pluginData) return null
        const { title, subMenu } = pluginData
        return (
          <>
            <Menu placement="right-start" isOpen={selectedCategoryTitle === title} key={title} autoSelect={false}>
              <MenuButton as="div" className="plugin-category-button" />
              <MenuList key={title} className="tool-shelf-menu-list plugin-submenu" data-testid={`plugin-submenu-${title}`}>
                {subMenu.length > 0
                    ? subMenu.map((pd, i) => <PluginItem key={pd?.title ?? `divider-${i}`} pluginData={pd} />)
                    : <MenuItem>{t("V3.ToolButtonData.pluginMenu.fetchError")}</MenuItem>
                }
              </MenuList>
            </Menu>
            <MenuItem as="div" className="tool-shelf-menu-item plugin-category-item"
              closeOnSelect={false} onPointerOver={()=>setSelectedCategoryTitle(title)}
              data-testid={`plugin-category-${title}`}
            >
              <span className="category-title">{title}</span>
              <RightArrow className="submenu-expand-icon" />
            </MenuItem>
          </>
        )
      })
    )
  }

  return (
    <Menu isLazy autoSelect={false}>
      <MenuButton
        className="tool-shelf-button tool-shelf-menu plugins"
        title={t("DG.ToolButtonData.optionMenu.toolTip")}
        data-testid="tool-shelf-button-plugins"
      >
        <PluginsIcon />
        <ToolShelfButtonTag className="tool-shelf-tool-label plugins" label={t("DG.ToolButtonData.pluginMenu.title")} />
      </MenuButton>
      <MenuList className="tool-shelf-menu-list plugins" data-testid="plugins-menu">
        {renderPluginCategoryList()}
      </MenuList>
    </Menu>
  )
}
