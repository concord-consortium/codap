import React from "react"
import {Box, Flex, HStack, Tag, useToast} from "@chakra-ui/react"
import t from "../../utilities/translation/translate"
import { uniqueName } from "../../utilities/js-utils"
import { IDocumentContentModel } from "../../models/document/document-content"
import { createDefaultTileOfType } from "../../models/codap/add-default-content"
import { getTileComponentIcon, getTileComponentInfo, ITileComponentInfo } from "../../models/tiles/tile-component-info"
import { IFreeTileRow } from "../../models/document/free-tile-row"
import { kSliderTileType } from "../slider/slider-defs"
import { isSliderModel } from "../slider/slider-model"
import MapIcon from '../../assets/icons/icon-map.svg'
import TextIcon from '../../assets/icons/icon-text.svg'
import PluginsIcon from '../../assets/icons/icon-plug.svg'

import './tool-shelf.scss'
const kFullWidth = 580
const kWidth25 = kFullWidth / 4
const kWidth75 = kFullWidth * 3 / 4
const kFullHeight = 300
const kHalfHeight = kFullHeight / 2
const kGap = 10
const kHeaderHeight = 25
const kOffset = 10

interface IProps {
  content?: IDocumentContentModel
}

export const ToolShelf = ({content}: IProps) => {
  const notify = (description: string) => {
      toast({
        position: "top-right",
        title: "Tool icon clicked",
        description,
        status: "success"
      })
    },
    toast = useToast()

  const row = content?.getRowByIndex(0) as IFreeTileRow

  const sliderHandler = () => {
    const existingSliderTiles = content?.getTilesOfType(kSliderTileType)
    const existingSliderNames = existingSliderTiles?.map(tile => {
      const sliderModel = tile.content
      const sliderName = (isSliderModel(sliderModel) && sliderModel.name)
      return sliderName
    })
    const numSliderTiles = (existingSliderTiles)?.length || 0
    const offsetPosition = kOffset * numSliderTiles
    if (row) {
      const sliderTile = createDefaultTileOfType(kSliderTileType)
      if (sliderTile) {
        const sliderOptions = { x: kFullWidth + kWidth25 + kGap + offsetPosition,
                                y: kHalfHeight + (kGap / 2) + offsetPosition,
                                width: kWidth75, height: kHalfHeight }
        const newSliderModel = sliderTile.content
        const newSliderTitle = (isSliderModel(newSliderModel) && newSliderModel.name) || ""
        const uniqueSliderTitle = uniqueName(newSliderTitle,
          (aVarName: string) =>
            (!existingSliderNames?.find(n => aVarName === n))
        )
        isSliderModel(newSliderModel) && newSliderModel.setName(uniqueSliderTitle)
        content?.insertTileInRow(sliderTile, row, sliderOptions)
      }
    }
  }

  const createTile = (tileType: string, componentInfo: ITileComponentInfo) => {
    if (row) {
      const newTile = createDefaultTileOfType(tileType)
      if (newTile) {
        const tileOptions = { width: componentInfo.width, height: componentInfo.height }
        content?.insertTileInRow(newTile, row, tileOptions)
        const rowTile = row.tiles.get(newTile.id)
        if (componentInfo.width && componentInfo.height) {
          rowTile?.setSize(componentInfo.width,  componentInfo.height + kHeaderHeight)
        }
      }
    }
  }

  const createComponentHandler = (tileType: string) => {
    const componentInfo = getTileComponentInfo(tileType)
    if (componentInfo) {
      if (componentInfo.isSingleton) {
        const tiles = content?.getTilesOfType(tileType)
        if (tiles && tiles.length > 0) {
          const tileId = tiles[0].id
          content?.deleteTile(tileId)
        } else {
          createTile(tileType, componentInfo)
        }
      } else {
        createTile(tileType, componentInfo)
      }
    }  else {
      notify(tileType)
    }
  }

  const buttonDescriptions = [
    {
      ariaLabel: 'Make a table',
      icon: getTileComponentIcon("CodapCaseTable"),
      iconLabel: t("DG.ToolButtonData.tableButton.title"),
      buttonHint: t("DG.ToolButtonData.tableButton.toolTip"),
      tileType: "CodapCaseTable"
    },
    {
      ariaLabel: 'Make a graph',
      icon: getTileComponentIcon("CodapGraph"),
      iconLabel: t("DG.ToolButtonData.graphButton.title"),
      buttonHint: t("DG.ToolButtonData.graphButton.toolTip"),
      tileType: "CodapGraph"
    },
    {
      ariaLabel: 'Make a map',
      icon: MapIcon,
      iconLabel: t("DG.ToolButtonData.mapButton.title"),
      buttonHint: t("DG.ToolButtonData.mapButton.toolTip"),
      tileType: "CodapMap"
    },
    {
      ariaLabel: 'Make a slider',
      icon: getTileComponentIcon("CodapSlider"),
      iconLabel: t("DG.ToolButtonData.sliderButton.title"),
      buttonHint: t("DG.ToolButtonData.sliderButton.toolTip"),
      tileType: "CodapSlider"
    },
    {
      ariaLabel: 'Open/close the calculator',
      icon: getTileComponentIcon("Calculator"),
      iconLabel: t("DG.ToolButtonData.calcButton.title"),
      buttonHint: t("DG.ToolButtonData.calcButton.toolTip"),
      tileType: "Calculator"
    },
    {
      ariaLabel: 'Make a text object',
      icon: TextIcon,
      iconLabel: t("DG.ToolButtonData.textButton.title"),
      buttonHint: t("DG.ToolButtonData.textButton.toolTip"),
      tileType: "CodapText"
    },
    {
      ariaLabel: 'Choose a plugin',
      icon: PluginsIcon,
      iconLabel: t("DG.ToolButtonData.pluginMenu.title"),
      buttonHint: t("DG.ToolButtonData.pluginMenu.toolTip"),
      tileType: "CodapPlugin"
    }
  ]

  return (
    <HStack className='tool-shelf' alignContent='center'>
      <Flex className="toolshelf-component-buttons" >
        {buttonDescriptions.map(aDesc => {
          return (
            <Box
              as='button'
              key={aDesc.iconLabel}
              bg='white'
              onClick={()=> createComponentHandler(aDesc.tileType)}
              data-testid={`tool-shelf-button-${aDesc.iconLabel}`}
              className="toolshelf-button"
              _hover={{ boxShadow: '1px 1px 1px 0px rgba(0, 0, 0, 0.5)' }}
              // :active styling is in css to override Chakra default
            >
              {<aDesc.icon/>}
              <Tag className='tool-shelf-tool-label'>{aDesc.iconLabel}</Tag>
            </Box>)
        })}
      </Flex>
    </HStack>
  )
}
