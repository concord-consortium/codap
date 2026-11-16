import { VisuallyHidden } from "@chakra-ui/react"
import React from "react"
import { t } from "../../utilities/translation/translate"

interface IProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "target" | "rel"> {
  "data-testid": string
  href: string
  showArrow?: boolean
  children: React.ReactNode
}

// A link that opens in a new tab and tells screen-reader users that it does.
export function ExternalLink({ "data-testid": dataTestId, href, showArrow, children, ...others }: IProps) {
  return (
    <a {...others} data-testid={dataTestId} href={href} target="_blank" rel="noopener noreferrer">
      {children}
      {showArrow && <span aria-hidden="true"> ↗</span>}
      <VisuallyHidden>{` ${t("V3.ExternalLink.opensInNewTab")}`}</VisuallyHidden>
    </a>
  )
}
