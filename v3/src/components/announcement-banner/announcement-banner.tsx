import React, { useEffect, useLayoutEffect, useState } from "react"
import { kCodapResourcesUrl } from "../../constants"
import {
  BannerConfig, dismissBanner, fetchBannerConfig, isPositiveNumber,
  isValidButtonUrl, isValidCssColor, parseMessageWithLinks
} from "./announcement-banner-utils"

import "./announcement-banner.scss"

const kAnnouncementBannerUrl = `${kCodapResourcesUrl}/notifications/v3-announcement-banner.json`

export function AnnouncementBanner() {
  const [config, setConfig] = useState<BannerConfig | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchBannerConfig(kAnnouncementBannerUrl).then(c => {
      if (!cancelled) setConfig(c)
    })
    return () => { cancelled = true }
  }, [])

  const visible = !!config && !dismissed
  useLayoutEffect(() => {
    const root = document.documentElement
    if (visible) {
      root.classList.add("has-announcement-banner")
      return () => root.classList.remove("has-announcement-banner")
    }
  }, [visible])

  if (!visible || !config) return null

  const {
    message,
    id,
    buttonText = "Learn More",
    buttonUrl,
    buttonTarget = "_blank",
    backgroundColor,
    textColor,
    buttonBackgroundColor,
    buttonTextColor,
    closeButtonColor,
    linkColor,
    paddingX,
    paddingY,
    buttonPaddingX,
    buttonPaddingY
  } = config

  const showButton = isValidButtonUrl(buttonUrl)

  const handleClose = () => {
    setDismissed(true)
  }

  const handleDontShowAgain = () => {
    dismissBanner(id)
    setDismissed(true)
  }

  const customStyles: React.CSSProperties = {}
  if (isValidCssColor(backgroundColor)) customStyles.backgroundColor = backgroundColor
  if (isValidCssColor(textColor)) customStyles.color = textColor
  if (isPositiveNumber(paddingY)) {
    customStyles.paddingTop = paddingY
    customStyles.paddingBottom = paddingY
  }
  if (isPositiveNumber(paddingX)) {
    customStyles.paddingLeft = paddingX
    customStyles.paddingRight = paddingX
  }

  const buttonStyles: React.CSSProperties = {}
  if (isValidCssColor(buttonBackgroundColor)) buttonStyles.backgroundColor = buttonBackgroundColor
  if (isValidCssColor(buttonTextColor)) buttonStyles.color = buttonTextColor
  if (isPositiveNumber(buttonPaddingY)) {
    buttonStyles.paddingTop = buttonPaddingY
    buttonStyles.paddingBottom = buttonPaddingY
  }
  if (isPositiveNumber(buttonPaddingX)) {
    buttonStyles.paddingLeft = buttonPaddingX
    buttonStyles.paddingRight = buttonPaddingX
  }

  const closeStyles: React.CSSProperties = {}
  if (isValidCssColor(closeButtonColor)) {
    closeStyles.color = closeButtonColor
    closeStyles.borderColor = closeButtonColor
  }
  if (isPositiveNumber(buttonPaddingY)) {
    closeStyles.paddingTop = buttonPaddingY
    closeStyles.paddingBottom = buttonPaddingY
  }
  if (isPositiveNumber(buttonPaddingX)) {
    closeStyles.paddingLeft = buttonPaddingX
    closeStyles.paddingRight = buttonPaddingX
  }

  const linkStyles: React.CSSProperties = {}
  if (isValidCssColor(linkColor)) linkStyles.color = linkColor

  return (
    <div
      className="announcement-banner"
      role="status"
      aria-label="Announcement"
      style={customStyles}
      data-testid="announcement-banner"
    >
      <span className="announcement-banner-message">
        {parseMessageWithLinks(message).map((segment, i) =>
          segment.url
            ? (
              <a key={i} href={segment.url} target="_blank" rel="noopener noreferrer" style={linkStyles}>
                {segment.text}
              </a>
            )
            : <React.Fragment key={i}>{segment.text}</React.Fragment>
        )}
      </span>

      <div className="announcement-banner-actions">
        {showButton && (
          <a
            href={buttonUrl}
            target={buttonTarget}
            rel="noopener noreferrer"
            className="announcement-banner-button"
            style={buttonStyles}
            data-testid="announcement-banner-button"
          >
            {buttonText}
          </a>
        )}

        <button
          type="button"
          className="announcement-banner-dont-show"
          style={closeStyles}
          onClick={handleDontShowAgain}
          data-testid="announcement-banner-dont-show"
        >
          Don&apos;t show again
        </button>

        <button
          type="button"
          className="announcement-banner-close"
          style={closeStyles}
          onClick={handleClose}
          aria-label="Close announcement"
          data-testid="announcement-banner-close"
        >
          &times;
        </button>
      </div>
    </div>
  )
}
