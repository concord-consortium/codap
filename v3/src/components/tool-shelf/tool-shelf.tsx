import React from "react"
import {Box, Flex, HStack, Tag, useToast} from "@chakra-ui/react"
import t from "../../utilities/translation/translate"
import { uniqueName } from "../../utilities/js-utils"
import { IDocumentContentModel } from "../../models/document/document-content"
import { createDefaultTileOfType } from "../../models/codap/add-default-content"
import { kCalculatorTileType } from "../calculator/calculator-defs"
import { kGraphTileType } from "../graph/graph-defs"
import { kSliderTileType } from "../slider/slider-defs"
import { kCaseTableTileType } from "../case-table/case-table-defs"
import { isSliderModel } from "../slider/slider-model"
import GraphIcon from '../../assets/icons/icon-graph.svg'
import TableIcon from '../../assets/icons/icon-table.svg'
import MapIcon from '../../assets/icons/icon-map.svg'
import SliderIcon from '../../assets/icons/icon-slider.svg'
import CalcIcon from '../../assets/icons/icon-calc.svg'
import TextIcon from '../../assets/icons/icon-text.svg'
import PluginsIcon from '../../assets/icons/icon-plug.svg'

import './tool-shelf.scss'

const kCalcHeight = 162
const kCalcWidth = 145
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
    toast = useToast(),
    mapHandler = () => notify('map'),
    textHandler = () => notify('text'),
    pluginsHandler = () => notify('plugins')

  const row = content?.getRowByIndex(0)

  const calcHandler = () => {
    // Calculator button is the only button that can open and close a tile
    const calculatorTile = content?.getTilesOfType(kCalculatorTileType)
    if (calculatorTile) {
      const tileId = calculatorTile[0].id //There can only be one calculator in the document
      content?.deleteTile(tileId)
    } else if (row) {
      const calcTile = createDefaultTileOfType(kCalculatorTileType)
      // if (!calcTile) return
      if (calcTile) {
        const calcOptions = { x: kFullWidth + kGap / 2, y: 2, width: kCalcWidth, height: kHeaderHeight + kCalcHeight }
        content?.insertTileInRow(calcTile, row, calcOptions)
      }
    }
  }

  const graphHandler = () => {
    const numGraphTiles = (content?.getTilesOfType(kGraphTileType))?.length || 0
    const offsetPosition = kOffset * numGraphTiles
     if (row) {
      const graphTile = createDefaultTileOfType(kGraphTileType)
      if (graphTile) {
        const graphOptions ={ x: kFullWidth + kGap + offsetPosition,
                              y: kFullHeight + kGap + offsetPosition,
                              width: kFullWidth, height: kFullHeight }
        content?.insertTileInRow(graphTile, row, graphOptions)
      }
    }
  }

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

  const tableHandler = () => {
    const numTableTiles = (content?.getTilesOfType(kCaseTableTileType))?.length || 0
    const offsetPosition = kOffset * numTableTiles
    if (row) {
      const tableTile = createDefaultTileOfType(kCaseTableTileType)
      if (tableTile) {
        const tableOptions ={ x: 2 + offsetPosition,
                              y: kFullHeight + kGap + offsetPosition,
                              width: kFullWidth, height: kFullHeight }
        content?.insertTileInRow(tableTile, row, tableOptions)
      }
    }
  }

  const buttonDescriptions = [
    {
      ariaLabel: 'Make a table',
      icon: TableIcon,
      iconLabel: t("DG.ToolButtonData.tableButton.title"),
      buttonHint: t("DG.ToolButtonData.tableButton.toolTip"),
      handler: tableHandler
    },
    {
      ariaLabel: 'Make a graph',
      icon: GraphIcon,
      iconLabel: t("DG.ToolButtonData.graphButton.title"),
      buttonHint: t("DG.ToolButtonData.graphButton.toolTip"),
      handler: graphHandler
    },
    {
      ariaLabel: 'Make a map',
      icon: MapIcon,
      iconLabel: t("DG.ToolButtonData.mapButton.title"),
      buttonHint: t("DG.ToolButtonData.mapButton.toolTip"),
      handler: mapHandler
    },
    {
      ariaLabel: 'Make a slider',
      icon: SliderIcon,
      iconLabel: t("DG.ToolButtonData.sliderButton.title"),
      buttonHint: t("DG.ToolButtonData.sliderButton.toolTip"),
      handler: sliderHandler
    },
    {
      ariaLabel: 'Open/close the calculator',
      icon: CalcIcon,
      iconLabel: t("DG.ToolButtonData.calcButton.title"),
      buttonHint: t("DG.ToolButtonData.calcButton.toolTip"),
      handler: calcHandler
    },
    {
      ariaLabel: 'Make a text object',
      icon: TextIcon,
      iconLabel: t("DG.ToolButtonData.textButton.title"),
      buttonHint: t("DG.ToolButtonData.textButton.toolTip"),
      handler: textHandler
    },
    {
      ariaLabel: 'Choose a plugin',
      icon: PluginsIcon,
      iconLabel: t("DG.ToolButtonData.pluginMenu.title"),
      buttonHint: t("DG.ToolButtonData.pluginMenu.toolTip"),
      handler: pluginsHandler
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
              onClick={aDesc.handler}
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
