import React from "react"
import {Box, Flex, HStack, Tag, useToast} from "@chakra-ui/react"
import t from "../../utilities/translation/translate"

import './tool-shelf.scss'
import GraphIcon from '../../assets/icons/icon-graph.svg'
import TableIcon from '../../assets/icons/icon-table.svg'
import MapIcon from '../../assets/icons/icon-map.svg'
import SliderIcon from '../../assets/icons/icon-slider.svg'
import CalcIcon from '../../assets/icons/icon-calc.svg'
import TextIcon from '../../assets/icons/icon-text.svg'
import PluginsIcon from '../../assets/icons/icon-plug.svg'

interface IProps {
  setCalculatorOpen: (open: boolean) => void
}

export const ToolShelf = ({setCalculatorOpen}: IProps) => {
  const notify = (description: string) => {
      toast({
        position: "top-right",
        title: "Tool icon clicked",
        description,
        status: "success"
      })
    },
    toast = useToast(),
    tableHandler = () => notify('table'),
    graphHandler = () => notify('graph'),
    mapHandler = () => notify('map'),
    sliderHandler = () => notify('slider'),
    calcHandler = () => handleCalculatorOpen(),
    textHandler = () => notify('text'),
    pluginsHandler = () => notify('plugins')

  const handleCalculatorOpen = () => {
    setCalculatorOpen(true)
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
