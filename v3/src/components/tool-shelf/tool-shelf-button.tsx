import { Box, Tag } from "@chakra-ui/react"
import { clsx } from "clsx"
import { getTileComponentIcon } from "../../models/tiles/tile-component-info"
import { getSpecialLangFontClassName, t } from "../../utilities/translation/translate"

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
  const langClass = getSpecialLangFontClassName()
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
  return Icon ? <ToolShelfButton icon={<Icon/>} onClick={handleClick} {...others} /> : null
}
