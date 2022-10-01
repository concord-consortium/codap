import React from "react"
import {Box, Flex, HStack, Tag, useToast, VStack} from "@chakra-ui/react"

import './tool-shelf.scss'
import GraphIcon from '../../assets/icons/icon-graph.svg'
import TableIcon from '../../assets/icons/icon-table.svg'
import MapIcon from '../../assets/icons/icon-map.svg'
import SliderIcon from '../../assets/icons/icon-slider.svg'
import CalcIcon from '../../assets/icons/icon-calc.svg'
import TextIcon from '../../assets/icons/icon-text.svg'
import PluginsIcon from '../../assets/icons/icon-plug.svg'

export const ToolShelf = () => {
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
    calcHandler = () => notify('calc'),
    textHandler = () => notify('text'),
    pluginsHandler = () => notify('plugins')

  const buttonDescriptions = [
    {
      ariaLabel: 'Make a table',
      icon: TableIcon,
      iconLabel: 'Tables …',
      buttonHint: 'Open a table for each dataset',
      handler: tableHandler
    },
    {
      ariaLabel: 'Make a graph',
      icon: GraphIcon,
      iconLabel: 'Graph',
      buttonHint: 'Make a graph',
      handler: graphHandler
    },
    {
      ariaLabel: 'Make a map',
      icon: MapIcon,
      iconLabel: 'Map',
      buttonHint: 'Make a map',
      handler: mapHandler
    },
    {
      ariaLabel: 'Make a slider',
      icon: SliderIcon,
      iconLabel: 'Slider',
      buttonHint: 'Make a slider',
      handler: sliderHandler
    },
    {
      ariaLabel: 'Open/close the calculator',
      icon: CalcIcon,
      iconLabel: 'Calc',
      buttonHint: 'Open/close the calculator',
      handler: calcHandler
    },
    {
      ariaLabel: 'Make a text object',
      icon: TextIcon,
      iconLabel: 'Text',
      buttonHint: 'Make a text object',
      handler: textHandler
    },
    {
      ariaLabel: 'Choose a plugin',
      icon: PluginsIcon,
      iconLabel: 'Plugins …',
      buttonHint: 'Add a plugin to the document',
      handler: pluginsHandler
    }
  ]

  return (
    <HStack className='tool-shelf' alignContent='center'>
      <Flex height='100%' borderRight='solid #888888'>
        {buttonDescriptions.map(aDesc => {
          return (
            <Box
              as='button'
              key={aDesc.iconLabel}
              bg='white'
              onClick={aDesc.handler}
              data-testid={`tool-shelf-button-${aDesc.iconLabel}`}
            >
              <VStack className='button-stack'>
                {<aDesc.icon height='25px'/>}
                <Tag className='tool-shelf-tool-label' bg='white'>{aDesc.iconLabel}</Tag>
              </VStack>
            </Box>)
        })}
      </Flex>
    </HStack>)
}

