import React, { useEffect, useState } from "react"
import { Menu, MenuButton, MenuItem, MenuList } from "@chakra-ui/react"
import PluginsIcon from '../../assets/icons/icon-plug.svg'
import { useDocumentContent } from "../../hooks/use-document-content"
import { t } from "../../utilities/translation/translate"
import { kWebViewTileType } from "../web-view/web-view-defs"
import { IWebViewModel } from "../web-view/web-view-model"
import { kRootPluginUrl, processPluginUrl } from "../web-view/web-view-utils"
import { ToolShelfButtonTag } from "./tool-shelf-button"

import "./plugins-button.scss"

const pluginDataUrl = `${kRootPluginUrl}/published-plugins.json`

interface PluginData {
  aegis?: string,
  categories: string[],
  description: string,
  "description-string"?: string,
  height: number,
  icon: string,
  isStandard: "true" | "false", // All have "true" for some reason
  path: string,
  title: string,
  "title-string"?: string,
  visible: boolean | "true" | "false", // Most have "true" or "false" for some reason, but a couple have true
  width: number
}

interface IPluginSelectionProps {
  pluginData: PluginData
}
function PluginSelection({ pluginData }: IPluginSelectionProps) {
  const documentContent = useDocumentContent()

  function handleClick() {
    documentContent?.applyUndoableAction(
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
  const [pluginData, setPluginData] = useState<PluginData[]>([])

  useEffect(() => {
    try {
      fetch(pluginDataUrl)
        .then(response => response.json())
        .then(json => setPluginData(json))
    } catch (error) {
      console.warn("Unable to load plugin data.", error)
    }
  }, [])

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
        {pluginData.map(pd => <PluginSelection key={pd.title} pluginData={pd} />)}
      </MenuList>
    </Menu>
  )
}
