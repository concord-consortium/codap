import React from "react"
import { observer } from "mobx-react-lite"
import { Menu, MenuButton, MenuItem, MenuList } from "@chakra-ui/react"
import OptionsIcon from "../../assets/icons/icon-options.svg"
import { useDocumentContent } from "../../hooks/use-document-content"
import { uiState } from "../../models/ui-state"
import { isFreeTileLayout } from "../../models/document/free-tile-row"
import { t } from "../../utilities/translation/translate"
import { kRightButtonBackground, ToolShelfButtonTag } from "./tool-shelf-button"
import { getTileComponentIcon } from "../../models/tiles/tile-component-info"
import { kSliderTileType } from "../slider/slider-defs"
import { ITileModel } from "../../models/tiles/tile-model"
import { isSliderModel } from "../slider/slider-model"
import { kCalculatorTileType } from "../calculator/calculator-defs"
import { isCalculatorModel } from "../calculator/calculator-model"
import { kCaseTableTileType } from "../case-table/case-table-defs"
import { isCaseTableModel } from "../case-table/case-table-model"
import { kGraphTileType } from "../graph/graph-defs"
import { isGraphContentModel } from "../graph/models/graph-content-model"
import { kMapTileType } from "../map/map-defs"
import { isMapContentModel } from "../map/models/map-content-model"
import WebViewIcon from "../../assets/icons/icon-media-tool.svg"

import "./tool-shelf.scss"

export const TilesListShelfButton = observer(function TilesListShelfButton() {
  const documentContent = useDocumentContent()
  const tilesArr: any[] = []
  if (documentContent?.tileMap) {
    tilesArr.push(...Array.from(documentContent.tileMap.values()))
  }

  const handleSelectTile = (tileId: string) => {
    uiState.setFocusedTile(tileId)
    const tileRow = documentContent?.findRowContainingTile(tileId)
    const tileLayout = tileRow?.getTileLayout(tileId)
    isFreeTileLayout(tileLayout) && tileLayout.setMinimized(false)
  }

  const getTitle = (tile: ITileModel) => {
    const { title } = tile || {}
    const tileName = () => {
      let model
      switch (tile.content.type) {
        case kSliderTileType:
          model = isSliderModel(tile.content) ? tile.content : undefined
          return model?.name || t("DG.DocumentController.sliderTitle")
        case kCalculatorTileType:
          model = isCalculatorModel(tile.content) ? tile.content : undefined
          return model?.name || t("DG.DocumentController.calculatorTitle")
        case kCaseTableTileType:
          model = isCaseTableModel(tile.content) ? tile.content : undefined
          return model?.data?.title || t("DG.DocumentController.caseTableTitle")
        case kGraphTileType:
          model = isGraphContentModel(tile.content) ? tile.content : undefined
          return tile.title || t("DG.DocumentController.graphTitle")
        case kMapTileType:
          model = isMapContentModel(tile.content) ? tile.content : undefined
          return tile.title || t("DG.DocumentController.mapTitle")
      }
    }
    return title || tileName() || t("DG.WebView.defaultTitle")
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
          {tilesArr?.map((tile) => {
            const Icon = getTileComponentIcon(tile?.content.type)
            const title = getTitle(tile)
            return (
              <MenuItem key={tile?.id} data-testid={`tiles-list-item ${tile.id}`}
                  onClick={()=>handleSelectTile(tile.id)}>
                {(Icon && <Icon className="tile-list-icon"/>) || <WebViewIcon className="tile-list-icon" />}
                {title}
              </MenuItem>
            )
          })}
        </MenuList>
      </Menu>
    </>
  )
})
