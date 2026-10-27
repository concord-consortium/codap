import React, { useEffect, useLayoutEffect, useState } from "react"
import { Logger } from "../../lib/logger"
import {
  BannerConfig, dismissBanner, fetchBannerConfig, isValidButtonUrl, parseMessageWithLinks
} from "./announcement-banner-utils"

import "./announcement-banner.scss"

// Fetch directly from codap-resources.concord.org (CloudFront distribution
// E1RS9TZVZBEEEC) rather than via codap.concord.org/codap-resources/* (E3H9X49AG3GYSO).
// The latter caches at the edge for 1 day under the S3-CORS policy, ignoring origin
// Cache-Control: no-cache headers on the banner JSON. The former honors no-cache properly.
// Other codap-resources paths (plugins, examples) still go through codap.concord.org
// where they benefit from caching and same-domain plugin requirements.
const kAnnouncementBannerUrl =
  "https://codap-resources.concord.org/notifications/v3-announcement-banner.json"

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

  // Log one impression per banner id per page load.
  const shownBannerId = config?.id
  useEffect(() => {
    if (shownBannerId) {
      Logger.log("Announcement banner shown", { bannerId: shownBannerId }, "banner",
        { analyticsArgs: ["bannerId"] })
    }
  }, [shownBannerId])

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

  const handleLinkClick = (url?: string) => {
    // Banner URLs are authored in codap-resources, so they're safe to send to GA.
    Logger.log("Announcement banner link clicked", { bannerId: id, url }, "banner",
      { analyticsArgs: ["bannerId", "url"] })
  }

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
              <a key={i} href={segment.url} target="_blank" rel="noopener noreferrer"
                onClick={() => handleLinkClick(segment.url)}>
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
            onClick={() => handleLinkClick(buttonUrl)}
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
