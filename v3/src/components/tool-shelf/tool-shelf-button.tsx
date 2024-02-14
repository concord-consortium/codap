import { Box, Tag } from "@chakra-ui/react"
import { clsx } from "clsx"
import React from "react"
import { getTileComponentIcon } from "../../models/tiles/tile-component-info"
import { t } from "../../utilities/translation/translate"

export interface IToolShelfButtonProps {
  className?: string
  icon: React.ReactElement
  label: string
  hint: string
  background?: string
  disabled?: boolean
  onClick: () => void
}
export const ToolShelfButton = ({
  className, icon, label, hint, background = "white", disabled, onClick
}: IToolShelfButtonProps) => {
  return (
    <Box
      as='button'
      bg={background}
      title={t(hint)}
      disabled={disabled}
      onClick={onClick}
      data-testid={`tool-shelf-button-${label.toLowerCase()}`}
      className={clsx("tool-shelf-button", className)}
      _hover={{ boxShadow: '1px 1px 1px 0px rgba(0, 0, 0, 0.5)' }}
      // :active styling is in css to override Chakra default
    >
      <>
        {icon}
        <Tag className='tool-shelf-tool-label' bg={background} >{t(label)}</Tag>
      </>
    </Box>
  )
}

export interface IToolShelfTileButtonProps {
  className?: string
  tileType: string
  label: string
  hint: string
  onClick: (tileType: string) => void
}
export function ToolShelfTileButton({ tileType, onClick, ...others }: IToolShelfTileButtonProps) {
  const Icon = getTileComponentIcon(tileType)
  const handleClick = () => onClick(tileType)
  return Icon && (
    <ToolShelfButton icon={Icon && <Icon/>} onClick={handleClick} {...others} />
  )
}
