import React from "react"
import {Box, Flex, HStack, Tag} from "@chakra-ui/react"
import { SetRequired } from "type-fest"
import t from "../../utilities/translation/translate"
import { IDocumentContentModel } from "../../models/document/document-content"
import { getTileComponentIcon, getTileComponentInfo, getTileComponentKeys, ITileComponentInfo }
    from "../../models/tiles/tile-component-info"

import './tool-shelf.scss'

// Type for components known to have shelf properties
type IShelfTileComponentInfo = SetRequired<ITileComponentInfo, "shelf">

interface IProps {
  content?: IDocumentContentModel
  createTileOfType?: (tileType: string, content?: IDocumentContentModel) => void
}

export const ToolShelf = ({ content, createTileOfType }: IProps) => {
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
            ButtonComponent
              ? <ButtonComponent tileType={type} key={`${type}-${idx}`} label={label} hint={hint}
                  content={content} createTileOfType={createTileOfType}/>
              : null
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
  createTileOfType?: (tileType: string, content?: IDocumentContentModel) => void
}

export const ToolShelfButton = ({tileType, label, hint, content, createTileOfType}: IToolShelfButtonProps) => {
  const Icon = getTileComponentIcon(tileType)

  return (
    <Box
      as='button'
      bg='white'
      title={t(hint)}
      onClick={() => createTileOfType?.(tileType, content)}
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
