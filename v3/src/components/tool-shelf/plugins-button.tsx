import React from "react"
import PluginIcon from '../../assets/icons/icon-plug.svg'
import { t } from "../../utilities/translation/translate"
import { ToolShelfButton } from "./tool-shelf-button"

export function PluginsButton() {
  return (
    <ToolShelfButton
      hint={t("DG.ToolButtonData.pluginMenu.toolTip")}
      icon={<PluginIcon />}
      label={t("DG.ToolButtonData.pluginMenu.title")}
      onClick={() => console.log(`... Clicked plugin button`)}
    />
  )
}
