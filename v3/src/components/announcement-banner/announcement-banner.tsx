import React, { useEffect, useLayoutEffect, useState } from "react"
import { kCodapResourcesUrl } from "../../constants"
import {
  BannerConfig, dismissBanner, fetchBannerConfig, isValidButtonUrl, parseMessageWithLinks
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

  const { message, id, buttonText = "Learn More", buttonUrl, buttonTarget = "_blank" } = config
  const showButton = isValidButtonUrl(buttonUrl)

  const handleClose = () => {
    setDismissed(true)
  }

  const handleDontShowAgain = () => {
    dismissBanner(id)
    setDismissed(true)
  }

  return (
    <div
      className="announcement-banner"
      role="status"
      aria-label="Announcement"
      data-testid="announcement-banner"
    >
      <span className="announcement-banner-message">
        {parseMessageWithLinks(message).map((segment, i) =>
          segment.url
            ? (
              <a key={i} href={segment.url} target="_blank" rel="noopener noreferrer">
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
            data-testid="announcement-banner-button"
          >
            {buttonText}
          </a>
        )}

        <button
          type="button"
          className="announcement-banner-dont-show"
          onClick={handleDontShowAgain}
          data-testid="announcement-banner-dont-show"
        >
          Don&apos;t show again
        </button>

        <button
          type="button"
          className="announcement-banner-close"
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
