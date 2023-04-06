import React from "react"
import {Box, Flex, HStack, Tag} from "@chakra-ui/react"
import t from "../../utilities/translation/translate"
import { IDocumentContentModel } from "../../models/document/document-content"
import { createDefaultTileOfType } from "../../models/codap/add-default-content"
import { getTileComponentIcon, getTileComponentInfo, getTileComponentKeys, ITileComponentInfo }
    from "../../models/tiles/tile-component-info"
import { isFreeTileRow } from "../../models/document/free-tile-row"
import { getPositionOfNewComponent } from "../../utilities/view-utils"

import './tool-shelf.scss'

const kHeaderHeight = 25

// Forces compiler to acknowledge that position in ITileComponentInfo is not undefined
// because undefined position is already filtered out prior to being sorted
interface IPositionedTileComponentInfo extends ITileComponentInfo {
  position: number
}

interface IProps {
  content?: IDocumentContentModel
}

export const ToolShelf = ({content}: IProps) => {
  const keys = getTileComponentKeys()
  const entries = keys.map(key => getTileComponentInfo(key))
                      .filter(info => info?.position != null) as IPositionedTileComponentInfo[]
  entries.sort((a, b) => (a.position) - (b.position))

  return (
    <HStack className='tool-shelf' alignContent='center' data-testid='tool-shelf'>
      <Flex className="toolshelf-component-buttons">
        {entries.map((entry, idx) => {
          if (!entry) return null
          const { ComponentToolshelfButton, type, toolshelfButtonOptions } = entry
          return (
            <>
              {ComponentToolshelfButton &&
                <ComponentToolshelfButton tileType={type} key={`${type}-${idx}`} options={toolshelfButtonOptions}
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

export interface IToolshelfButtonProps {
  tileType: string,
  options?: {iconLabel?: string, buttonHint?: string, tileType?: string},
  content?: IDocumentContentModel
}

export const ToolshelfButton = ({tileType, options, content}: IToolshelfButtonProps) => {
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
      title={t(options?.buttonHint || "")}
      onClick={() => createComponent(tileType)}
      data-testid={`tool-shelf-button-${t(options?.iconLabel || "")}`}
      className="toolshelf-button"
      _hover={{ boxShadow: '1px 1px 1px 0px rgba(0, 0, 0, 0.5)' }}
      // :active styling is in css to override Chakra default
    >
      <>
        {Icon && <Icon />}
        <Tag className='tool-shelf-tool-label'>{t(options?.iconLabel || "")}</Tag>
      </>
    </Box>
  )
}
