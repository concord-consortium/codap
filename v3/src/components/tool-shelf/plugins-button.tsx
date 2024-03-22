import React, { useEffect, useState } from "react"
import { Menu, MenuButton, MenuItem, MenuList, Tag } from "@chakra-ui/react"
import PluginsIcon from '../../assets/icons/icon-plug.svg'
import { useDocumentContent } from "../../hooks/use-document-content"
import { t } from "../../utilities/translation/translate"
import { kWebViewTileType } from "../web-view/web-view-defs"
import { IWebViewModel } from "../web-view/web-view-model"

import "./plugins-button.scss"

const rootPluginUrl = "https://codap-resources.s3.amazonaws.com/plugins"
const pluginDataUrl = `${rootPluginUrl}/published-plugins.json`

interface PluginData {
  aegis?: string,
  categories: string[],
  description: string,
  "description-string": string,
  height: number,
  icon: string,
  isStandard: string, // All have "true" for some reason
  path: string,
  title: string,
  "title-string": string,
  visible: boolean | string, // Most have "true" or "false" for some reason, but a couple have true
  width: number
}

interface IPluginSelectionProps {
  pluginData: PluginData
}
function PluginSelection({ pluginData }: IPluginSelectionProps) {
  const documentContent = useDocumentContent()

  function handleClick() {
    const url = `${rootPluginUrl}${pluginData.path}`
    documentContent?.applyUndoableAction(() => {
      // TODO v2 eliminates the undo history when you add a plugin
      const tile = documentContent?.createOrShowTile?.(kWebViewTileType)
      if (tile) (tile.content as IWebViewModel).setUrl(url)
      // TODO Set the tile's height and width
    }, "", "")
  }

  return (
    <MenuItem
      data-testid="tool-shelf-plugins-option"
      onClick={handleClick}
    >
      <div className="plugin-selection">
        <img className="plugin-selection-icon" src={`${rootPluginUrl}${pluginData.icon}`} />
        <span className="plugin-selection-title">{pluginData.title}</span>
      </div>
    </MenuItem>
  )
}

export function PluginsButton() {
  const [pluginData, setPluginData] = useState<PluginData[]>([])

  useEffect(() => {
    fetch(pluginDataUrl)
      .then(response => response.json())
      .then(json => setPluginData(json))
  }, [])

  return (
    <Menu isLazy>
      <MenuButton
        className="tool-shelf-button menu plugins"
        title={t("DG.ToolButtonData.optionMenu.toolTip")}
        data-testid="tool-shelf-button-plugins"
      >
        <PluginsIcon />
        <Tag className="tool-shelf-tool-label">{t("DG.ToolButtonData.pluginMenu.title")}</Tag>
      </MenuButton>
      <MenuList>
        {pluginData.map(pd => <PluginSelection key={pd.title} pluginData={pd} />)}
      </MenuList>
    </Menu>
  )
}
