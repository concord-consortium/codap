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

/** Stable, locale-independent kebab-case suffix for tool-shelf button testids. */
export function toolShelfButtonTestId(tileType: string): string {
  // Strip optional "Codap" prefix used by some tile types (CodapSlider, CodapText, CodapWebView)
  // so the result is just the semantic type name in kebab-case.
  const stripped = tileType.replace(/^Codap/, "")
  const kebab = stripped
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
  return `tool-shelf-button-${kebab}`
}

export interface IToolShelfButtonProps {
  className?: string
  icon: React.ReactElement
  label: string
  hint: string
  disabled?: boolean
  /** Required for locale-independence. Callers must pass a stable kebab-case identifier
   *  — tool-shelf buttons previously fell back to `label.toLowerCase()`, which varied by
   *  locale and could introduce spaces (e.g. "web page"). */
  testId: string
  onClick: () => void
}
export const ToolShelfButton = ({
  className, icon, label, hint, disabled, testId, onClick
}: IToolShelfButtonProps) => {
  const langClass = getSpecialLangFontClassName()
  return (
    <Box
      as='button'
      title={t(hint)}
      aria-label={t(hint)}
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onClick}
      data-testid={testId}
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
  return Icon
    ? <ToolShelfButton icon={<Icon/>} onClick={handleClick} testId={toolShelfButtonTestId(tileType)} {...others} />
    : null
}
