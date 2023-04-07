import React from "react"
import {Box, Flex, HStack, Tag} from "@chakra-ui/react"
import { SetRequired } from "type-fest"
import t from "../../utilities/translation/translate"
import { IDocumentContentModel } from "../../models/document/document-content"
import { createDefaultTileOfType } from "../../models/codap/add-default-content"
import { getTileComponentIcon, getTileComponentInfo, getTileComponentKeys, ITileComponentInfo }
    from "../../models/tiles/tile-component-info"
import { isFreeTileRow } from "../../models/document/free-tile-row"
import { getPositionOfNewComponent } from "../../utilities/view-utils"

import './tool-shelf.scss'

const kHeaderHeight = 25

// Type for components known to have shelf properties
type IShelfTileComponentInfo = SetRequired<ITileComponentInfo, "shelf">

interface IProps {
  content?: IDocumentContentModel
}

export const ToolShelf = ({content}: IProps) => {
  const keys = getTileComponentKeys()
  const entries = keys.map(key => getTileComponentInfo(key))
                      .filter(info => info?.shelf != null) as IShelfTileComponentInfo[]
  entries.sort((a, b) => a.shelf.position - b.shelf.position)

  return (
    <HStack className='tool-shelf' alignContent='center' data-testid='tool-shelf'>
      <Flex className="tool-shelf-component-buttons">
        {entries.map((entry, idx) => {
          if (!entry) return null
          const { type, shelf: { ButtonComponent = ToolShelfButton, label, hint } } = entry
          return (
            <>
              {ButtonComponent &&
                <ButtonComponent tileType={type} key={`${type}-${idx}`} label={label} hint={hint}
                    content={content}
                />
              }
            </>
          )
        })}
      </Flex>
    </HStack>
  )
}

export interface IToolShelfButtonProps {
  tileType: string
  label: string
  hint: string
  content?: IDocumentContentModel
}

export const ToolShelfButton = ({tileType, label, hint, content}: IToolShelfButtonProps) => {
  const Icon = getTileComponentIcon(tileType)

  const row = content?.getRowByIndex(0)
  const toggleTileVisibility = (type: string, componentInfo: ITileComponentInfo) => {
    const tiles = content?.getTilesOfType(type)
    if (tiles && tiles.length > 0) {
      const tileId = tiles[0].id
      content?.deleteTile(tileId)
    } else {
      createTile(type, componentInfo)
    }
  }

  const createTile = (type: string, componentInfo: ITileComponentInfo) => {
    const width = componentInfo.defaultWidth
    const height = componentInfo.defaultHeight
    if (row) {
      const newTile = createDefaultTileOfType(tileType)
      if (newTile) {
        if (isFreeTileRow(row)) {
          const newTileSize = {width, height}
          const {x, y} = getPositionOfNewComponent(newTileSize)
          const tileOptions = { x, y, width, height }
          content?.insertTileInRow(newTile, row, tileOptions)
          const rowTile = row.tiles.get(newTile.id)
          if (componentInfo.defaultWidth && componentInfo.defaultHeight) {
            rowTile?.setSize(componentInfo.defaultWidth,  componentInfo.defaultHeight + kHeaderHeight)
            rowTile?.setPosition(tileOptions.x, tileOptions.y)
          }
        }
      }
    }
  }

  const createComponent= (type: string) => {
    const componentInfo = getTileComponentInfo(tileType)
    if (componentInfo) {
      if (componentInfo.isSingleton) {
        toggleTileVisibility(tileType, componentInfo)
      } else {
        createTile(tileType, componentInfo)
      }
    }
  }
  return (
    <Box
      as='button'
      bg='white'
      title={t(hint)}
      onClick={() => createComponent(tileType)}
      data-testid={`tool-shelf-button-${t(label)}`}
      className="tool-shelf-button"
      _hover={{ boxShadow: '1px 1px 1px 0px rgba(0, 0, 0, 0.5)' }}
      // :active styling is in css to override Chakra default
    >
      <>
        {Icon && <Icon />}
        <Tag className='tool-shelf-tool-label'>{t(label)}</Tag>
      </>
    </Box>
  )
}
