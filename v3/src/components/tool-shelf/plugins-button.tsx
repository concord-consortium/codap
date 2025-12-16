import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import React, { useRef } from "react"
import { Menu, MenuButton, MenuDivider, MenuItem, MenuList } from "@chakra-ui/react"
import { kRootPluginsUrl } from "../../constants"
import { useDocumentContent } from "../../hooks/use-document-content"
import { useOutsidePointerDown } from "../../hooks/use-outside-pointer-down"
import { useRemotePluginsConfig } from "../../hooks/use-remote-plugins-config"
import { DEBUG_PLUGINS } from "../../lib/debug"
import { logMessageWithReplacement } from "../../lib/log-message"
import { persistentState } from "../../models/persistent-state"
import { getSpecialLangFontClassName, t } from "../../utilities/translation/translate"
import { kWebViewTileType } from "../web-view/web-view-defs"
import { isWebViewModel } from "../web-view/web-view-model"
import { processWebViewUrl } from "../web-view/web-view-utils"
import { PluginData, PluginMenuConfig } from "./plugin-config-types"
import { ToolShelfButtonTag } from "./tool-shelf-button"

import RightArrow from "../../assets/icons/arrow-right.svg"
import PluginsIcon from "../../assets/icons/icon-plugins.svg"
import ChoosyIcon from "../../assets/plugins/plugin-choosy-icon.svg"
import DayLengthIcon from "../../assets/plugins/plugin-day-length-icon.svg"
import DrawToolIcon from "../../assets/plugins/plugin-draw-tool-icon.svg"
import MicrodataPortalIcon from "../../assets/plugins/plugin-microdata-portal-icon.svg"
import NasaEarthAirAndWaterIcon from "../../assets/plugins/plugin-nasa-earth-air-and-water-icon.svg"
import NasaEarthObservatoryIcon from "../../assets/plugins/plugin-nasa-earth-observatory-icon.svg"
import NHANESPortalIcon from "../../assets/plugins/plugin-nhanes-portal-icon.svg"
import NOAAWeatherIcon from "../../assets/plugins/plugin-noaa-weather-icon.svg"
import SamplerIcon from "../../assets/plugins/plugin-sampler-icon.svg"
import ScramblerIcon from "../../assets/plugins/plugin-scrambler-icon.svg"
import SimmerIcon from "../../assets/plugins/plugin-simmer-icon.svg"
import SonifyIcon from "../../assets/plugins/plugin-sonify-icon.svg"
import SpaceTimeCubeIcon from "../../assets/plugins/plugin-space-time-cube-icon.svg"
import StoryBuilderIcon from "../../assets/plugins/plugin-story-builder-icon.svg"
import TestimateIcon from "../../assets/plugins/plugin-testimate-icon.svg"
import TransformersIcon from "../../assets/plugins/plugin-transformers-icon.svg"
import _debugPlugins from "./debug-plugins.json"
import _standardPlugins from "./standard-plugins.json"

import "./plugins-button.scss"
import "./tool-shelf.scss"

const debugPlugins = DEBUG_PLUGINS ? _debugPlugins as PluginMenuConfig : []
const standardPlugins = _standardPlugins as PluginMenuConfig
const combinedPlugins = [...standardPlugins, ...debugPlugins]

const iconComponents: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
  ChoosyIcon, DayLengthIcon, DrawToolIcon, MicrodataPortalIcon, NasaEarthAirAndWaterIcon, NasaEarthObservatoryIcon,
  NHANESPortalIcon, NOAAWeatherIcon, PluginsIcon, SamplerIcon, ScramblerIcon, SimmerIcon, SonifyIcon, SpaceTimeCubeIcon,
  StoryBuilderIcon, TestimateIcon, TransformersIcon
}

// A MenuItem for a single plugin
interface IPluginItemProps {
  onClose?: () => void
  pluginData: PluginData | null
}
function PluginItem({ onClose, pluginData }: IPluginItemProps) {
  const documentContent = useDocumentContent()
  const { disabled, height, hidden, icon, path, title, width } = pluginData || {}

  if (hidden) return null

  function handleClick() {
    if (!pluginData) return
    documentContent?.applyModelChange(
      () => {
        const url = URL.canParse(pluginData.path) ? pluginData.path : processWebViewUrl(`${kRootPluginsUrl}${path}`)
        const options = { height, width }
        const tile = documentContent?.createOrShowTile?.(kWebViewTileType, options)
        if (isWebViewModel(tile?.content)) {
          title && tile.setName(title)
          tile.content.setUrl(url)
          tile.content.setPluginCandidate(true)
        }
      }, {
        undoStringKey: t("V3.Undo.plugin.create", { vars: [title] }),
        redoStringKey: t("V3.Redo.plugin.create", { vars: [title] }),
        log: logMessageWithReplacement("Add Plugin: %@", { name: title, url: path })
      }
    )
    onClose?.()
  }
  const IconComponent = iconComponents[icon ?? ""]

  const displayTitle = `${title}${disabled ? " 🚧" : ""}`
  return pluginData ? (
    <MenuItem
      className="tool-shelf-menu-item plugins-menu-item"
      data-testid="tool-shelf-plugins-option"
      isDisabled={disabled}
      onClick={handleClick}
    >
      <div className="plugin-selection">
        {IconComponent && <IconComponent className="plugin-selection-icon" />}
        <span className="plugin-selection-title">{displayTitle}</span>
      </div>
    </MenuItem>
  ) : <MenuDivider/>
}

// A MenuItem for a group of plugins, which contains a submenu of the plugins
interface IPluginGroupMenuProps {
  isOpen: boolean
  onClose?: () => void
  onPointerOver?: React.PointerEventHandler<HTMLButtonElement>
  plugins: PluginData[]
  title: string
}
const PluginGroupMenu = observer(function PluginGroupMenu({
  isOpen, onClose, onPointerOver, title, plugins
}: IPluginGroupMenuProps) {
  return (
    <>
      {isOpen && (
        <Menu isOpen={isOpen} placement="right-start">
          <MenuButton as="div" className="plugin-group-menu-button" />
          <MenuList className="tool-shelf-menu-list submenu">
            {plugins.map((plugin, i) => (
              <PluginItem key={plugin?.title ?? `divider-${i}`} onClose={onClose} pluginData={plugin} />
            ))}
          </MenuList>
        </Menu>
      )}
      <MenuItem
        as="div"
        className="plugin-group-menu-item tool-shelf-menu-item"
        closeOnSelect={false}
        key={title}
        onPointerOver={onPointerOver}
      >
        <span className="category-title">{title}</span>
        <RightArrow className="submenu-expand-icon" />
      </MenuItem>
    </>
  )
})

export const PluginsButton = observer(function PluginsButton() {
  const menuRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef<() => void>()
  const [openSubmenuId, setOpenSubmenuId] = React.useState<string | null>(null)
  const { plugins: remotePlugins } = useRemotePluginsConfig()
  const pluginGroups: PluginMenuConfig =
    remotePlugins.length ? [...combinedPlugins, ...remotePlugins] : combinedPlugins

  const handleClose = () => onCloseRef.current?.()

  useOutsidePointerDown({
    ref: menuRef,
    handler: handleClose
  })

  const className = clsx("tool-shelf-button", "tool-shelf-menu", "plugins", getSpecialLangFontClassName())
  const placement = persistentState.toolbarPosition === "Top" ? "bottom-start" : "right-start"
  return (
    <div className="tool-shelf-button no-padding" ref={menuRef}>
      <Menu
        autoSelect={false}
        boundary="scrollParent"
        onClose={() => setOpenSubmenuId(null)}
        placement={placement}
      >
        {({ onClose }) => {
          onCloseRef.current = onClose
          return (
            <>
              <MenuButton
                className={className}
                title={t("DG.ToolButtonData.optionMenu.toolTip")}
                data-testid="tool-shelf-button-plugins"
              >
                <PluginsIcon />
                <ToolShelfButtonTag className="plugins" label={t("DG.ToolButtonData.pluginMenu.title")} />
              </MenuButton>
              <MenuList className="tool-shelf-menu-list top-menu plugins">
                {pluginGroups.map(pluginGroup => {
                  const { plugins, title } = pluginGroup
                  return (
                    <PluginGroupMenu
                      key={title}
                      isOpen={openSubmenuId === title}
                      onClose={handleClose}
                      onPointerOver={() => setOpenSubmenuId(title)}
                      plugins={plugins}
                      title={title}
                    />
                  )
                })}
              </MenuList>
            </>
          )
        }}
      </Menu>
    </div>
  )
})
