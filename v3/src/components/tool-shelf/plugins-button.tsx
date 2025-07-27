import React, { useState } from "react"
import { clsx } from "clsx"
import { Menu, MenuButton, MenuItem, MenuList } from "@chakra-ui/react"
import { kRootPluginsUrl } from "../../constants"
import { useRemotePluginsConfig } from "../../hooks/use-remote-plugins-config"
import { useDocumentContent } from "../../hooks/use-document-content"
import { DEBUG_PLUGINS } from "../../lib/debug"
import { getSpecialLangFontClassName } from "../../utilities/translation/languages"
import { gLocale } from "../../utilities/translation/locale"
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
import PluginsIcon from "../../assets/icons/icon-plugins.svg"
import RightArrow from "../../assets/icons/arrow-right.svg"
import DrawToolIcon from "../../assets/plugins/plugin-draw-tool-icon.svg"
import SonifyIcon from "../../assets/plugins/plugin-sonify-icon.svg"
import StoryBuilderIcon from "../../assets/plugins/plugin-story-builder-icon.svg"
import MicrodataPortalIcon from "../../assets/plugins/plugin-microdata-portal-icon.svg"
import NOAAWeatherIcon from "../../assets/plugins/plugin-noaa-weather-icon.svg"
import SamplerIcon from "../../assets/plugins/plugin-sampler-icon.svg"
import ChoosyIcon from "../../assets/plugins/plugin-choosy-icon.svg"
import TransformersIcon from "../../assets/plugins/plugin-transformers-icon.svg"
import ScramblerIcon from "../../assets/plugins/plugin-scrambler-icon.svg"

import "./plugins-button.scss"
import "./tool-shelf.scss"

interface IPluginItemProps {
  pluginData: PluginData | null
}

export function PluginsButton() {
  const { plugins: remotePlugins } = useRemotePluginsConfig()
  const pluginItems: (PluginSubMenuItems | null)[] =
    remotePlugins.length ? [...combinedPlugins, null, ...remotePlugins] : combinedPlugins
  const [selectedCategoryTitle, setSelectedCategoryTitle] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const onClose = () => setIsOpen(false)
  const onOpen = () => setIsOpen(true)
  const iconComponents: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
    DrawToolIcon, SonifyIcon, StoryBuilderIcon, MicrodataPortalIcon, NOAAWeatherIcon,
    SamplerIcon, ChoosyIcon, TransformersIcon, ScramblerIcon
  }
  const langClass = getSpecialLangFontClassName(gLocale.current)

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
          setSelectedCategoryTitle(null)
          setIsOpen(false)
        }, {
          undoStringKey: t("V3.Undo.plugin.create", { vars: [pluginData.title] }),
          redoStringKey: t("V3.Redo.plugin.create", { vars: [pluginData.title] }),
          log: logMessageWithReplacement("Add Plugin: %@", { name: pluginData.title, url: pluginData.path })
        }
      )
    }

    const isStandardPlugin = standardPlugins.some(category =>
                                category.subMenu.some(item => item?.title === pluginData?.title))
    const IconComponent = iconComponents[pluginData?.icon || ""]
    return (
      pluginData &&
        <MenuItem className="tool-shelf-menu-item plugin-selection" data-testid="tool-shelf-plugins-option"
            onClick={handleClick} closeOnSelect={true}>
          {isStandardPlugin ? <IconComponent className="plugin-icon" />
                            : <img className="plugin-icon" src={`${kRootPluginsUrl}${pluginData.icon}`} />}
          <span className="plugin-selection-title">{pluginData.title}</span>
        </MenuItem>
    )
  }

  const renderPluginCategoryList = () => {
    if (!pluginItems.length) return null
    return (
      pluginItems.map((pluginData: PluginSubMenuItems | null) => {
        if (!pluginData) return null
        const { title, subMenu } = pluginData
        return (
          <React.Fragment key={title}>
            <Menu placement="right-start" isOpen={selectedCategoryTitle === title} key={title} autoSelect={false}>
              <MenuButton as="div" className="plugin-category-button" data-testid={`plugin-category-button-${title}`} />
              <MenuList key={title} className="tool-shelf-menu-list plugin-submenu submenu"
                  data-testid={`plugin-submenu-${title}`}
                  onPointerLeave={() => setSelectedCategoryTitle(null)}>
                {subMenu.length > 0 &&
                    subMenu.map((pd, i) => <PluginItem key={pd?.title ?? `divider-${i}`} pluginData={pd} />)
                }
              </MenuList>
            </Menu>
            <MenuItem as="div" className="tool-shelf-menu-item plugin-category-item"
              closeOnSelect={false} data-testid={`plugin-category-${title}`}
              onPointerOver={()=>setSelectedCategoryTitle(title)}
            >
              <span className="category-title">{title}</span>
              <RightArrow className="submenu-expand-icon" />
            </MenuItem>
          </React.Fragment>
        )
      })
    )
  }

  return (
    <Menu isLazy autoSelect={false} isOpen={isOpen} onOpen={onOpen} onClose={onClose} >
      <MenuButton
        className={clsx("tool-shelf-button", "tool-shelf-menu", "plugins", langClass, {"menu-open": isOpen})}
        title={t("DG.ToolButtonData.optionMenu.toolTip")}
        data-testid="tool-shelf-button-plugins"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <PluginsIcon />
        <ToolShelfButtonTag className="tool-shelf-tool-label plugins" label={t("DG.ToolButtonData.pluginMenu.title")}/>
      </MenuButton>
      <MenuList className="tool-shelf-menu-list plugins" data-testid="plugins-menu"
          onPointerLeave={() => setSelectedCategoryTitle(null)}>
        {renderPluginCategoryList()}
      </MenuList>
    </Menu>
  )
}
