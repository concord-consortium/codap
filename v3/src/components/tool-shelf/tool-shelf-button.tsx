import { Box, Tag } from "@chakra-ui/react"
import { clsx } from "clsx"
import React from "react"
import { getTileComponentIcon } from "../../models/tiles/tile-component-info"
import { t } from "../../utilities/translation/translate"

export const kRightButtonBackground = "#ececec"

interface IToolShelfButtonTagProps {
  bg?: string
  className?: string
  label: string
}
export function ToolShelfButtonTag({ bg = "white", className, label }: IToolShelfButtonTagProps) {
  return <Tag className={clsx("tool-shelf-tool-label", className)} bg={bg}>{label}</Tag>
}

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
      <Box className="tool-shelf-button-icon-wrapper">
        {icon}
      </Box>
      <ToolShelfButtonTag bg={background} label={t(label)} />
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
