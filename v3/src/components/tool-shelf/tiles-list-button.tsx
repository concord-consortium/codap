import React from "react"
import { observer } from "mobx-react-lite"
import { Menu, MenuButton, MenuItem, MenuList } from "@chakra-ui/react"
import OptionsIcon from "../../assets/icons/icon-options.svg"
import { useDocumentContent } from "../../hooks/use-document-content"
import { uiState } from "../../models/ui-state"
import { IFreeTileLayout } from "../../models/document/free-tile-row"
import { t } from "../../utilities/translation/translate"
import { kRightButtonBackground, ToolShelfButtonTag } from "./tool-shelf-button"
import GraphIcon from "../../assets/icons/icon-graph.svg"
import TableIcon from "../../assets/icons/icon-table.svg"
import SliderIcon from "../../assets/icons/icon-slider.svg"
import MapIcon from "../../assets/icons/icon-map.svg"
import CalculatorIcon from "../../assets/icons/icon-calc.svg"
import GuideIcon from "../../assets/icons/icon-guide.svg"
import WebViewIcon from "../../assets/icons/icon-media-tool.svg"

import "./tool-shelf.scss"

export const TilesListShelfButton = observer(function TilesListShelfButton() {
  const documentContent = useDocumentContent()
  const tilesArr: any[] = []

  documentContent?.tileMap.forEach((tile) => {
    tilesArr.push(tile)
  })

  const tileTypeIconMap = [{type: "Graph", icon: <GraphIcon className="tile-list-icon"/>},
                            {type: "CaseTable", icon: <TableIcon className="tile-list-icon"/>},
                            {type: "CodapSlider", icon: <SliderIcon className="tile-list-icon"/>},
                            {type: "Map", icon: <MapIcon className="tile-list-icon"/>},
                            {type: "Calculator", icon: <CalculatorIcon className="tile-list-icon"/>},
                            {type: "Guide", icon: <GuideIcon className="tile-list-icon"/>},
                            {type: "CodapWebView", icon: <WebViewIcon className="tile-list-icon"/>}
                          ]

  const handleSelectTile = (tileId: string) => {
    uiState.setFocusedTile(tileId)
    const tileRow = documentContent?.findRowContainingTile(tileId)
    const tileLayout = tileRow?.getTileLayout(tileId) as IFreeTileLayout
    tileLayout.setMinimized(false)
  }

  return (
    <>
      <Menu isLazy>
        <MenuButton
          className="tool-shelf-button tiles-list-menu"
          title={t("DG.ToolButtonData.tileListMenu.toolTip")}
          data-testid="tool-shelf-button-options"
        >
          <OptionsIcon />
          <ToolShelfButtonTag
            bg={kRightButtonBackground}
            className="tiles-list"
            label={t("DG.ToolButtonData.tileListMenu.title")}
          />
        </MenuButton>
        <MenuList>
          {tilesArr.map((tile) => {
            console.log("tile", tile.title)
            return (
            <MenuItem key={tile.id} data-testid={`tiles-list-item ${tile.id}`} onClick={()=>handleSelectTile(tile.id)}>
                {tileTypeIconMap.find((iconMap) => iconMap.type === tile.content.type)?.icon}
                {tile.title ?? t("DG.WebView.defaultTitle")}
            </MenuItem>
            )
          })}
        </MenuList>
      </Menu>
    </>
  )
})
