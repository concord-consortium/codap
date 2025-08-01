import { Box, Tag } from "@chakra-ui/react"
import { clsx } from "clsx"
import React from "react"
import { getTileComponentIcon } from "../../models/tiles/tile-component-info"
import { t } from "../../utilities/translation/translate"
import { gLocale } from "../../utilities/translation/locale"
import { getSpecialLangFontClassName } from "../../utilities/translation/languages"

interface IToolShelfButtonTagProps {
  className?: string
  label: string
}
export function ToolShelfButtonTag({className, label }: IToolShelfButtonTagProps) {
  return <Tag className={clsx("tool-shelf-tool-label", className)} >{label}</Tag>
}

export interface IToolShelfButtonProps {
  className?: string
  icon: React.ReactElement
  label: string
  hint: string
  disabled?: boolean
  onClick: () => void
}
export const ToolShelfButton = ({
  className, icon, label, hint, disabled, onClick
}: IToolShelfButtonProps) => {
  const langClass = getSpecialLangFontClassName(gLocale.current)
  return (
    <Box
      as='button'
      title={t(hint)}
      disabled={disabled}
      onClick={onClick}
      data-testid={`tool-shelf-button-${label.toLowerCase()}`}
      className={clsx("tool-shelf-button", langClass, className)}
    >
      <Box className={clsx("tool-shelf-button-content", langClass)}>
        {icon}
        <ToolShelfButtonTag label={t(label)} />
      </Box>
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
