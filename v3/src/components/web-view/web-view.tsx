import { observer } from "mobx-react-lite"
import { useEffect, useRef, useState } from "react"
import { detectDataUrlImageBug, hasDataUrlImageBug } from "../../utilities/image-utils"
import { t } from "../../utilities/translation/translate"
import { booleanParam, urlParams } from "../../utilities/url-params"
import { ITileBaseProps } from "../tiles/tile-base-props"
import { useDataInteractiveController } from "./use-data-interactive-controller"
import { kWebViewBodyClass } from "./web-view-defs"
import { WebViewDropOverlay } from "./web-view-drop-overlay"
import { isWebViewModel } from "./web-view-model"

import "./web-view.scss"

/**
 * Convert a data URL to an object URL (blob URL).
 * Object URLs are more memory-efficient for large images and avoid
 * Safari issues with large data URLs.
 */
function dataUrlToObjectUrl(dataUrl: string): string | null {
  try {
    // Check if it's a data URL
    if (!dataUrl.startsWith("data:")) {
      return dataUrl // Return as-is if not a data URL
    }

    // Parse the data URL
    const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
    if (!matches) {
      return dataUrl
    }

    const mimeType = matches[1]
    const base64Data = matches[2]

    // Decode base64 to binary
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // Create blob and object URL
    const blob = new Blob([bytes], { type: mimeType })
    return URL.createObjectURL(blob)
  } catch (e) {
    return dataUrl
  }
}

/**
 * Canvas-based image renderer used as fallback when the browser has a bug
 * rendering data URLs in <img> elements (e.g., Safari on macOS 26).
 */
function CanvasImage({ src }: { src: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const objectUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!src || !canvasRef.current) return

    // Convert data URL to object URL for better Safari compatibility
    const imageUrl = dataUrlToObjectUrl(src)
    if (!imageUrl) return

    // Track object URL for cleanup
    if (imageUrl !== src) {
      objectUrlRef.current = imageUrl
    }

    const img = new Image()
    img.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) return

      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.drawImage(img, 0, 0)
      }
    }
    img.src = imageUrl

    // Cleanup object URL on unmount or src change
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }
  }, [src])

  return (
    <canvas
      ref={canvasRef}
      className="codap-web-view-image"
      style={{
        maxWidth: "100%",
        maxHeight: "100%",
        objectFit: "contain"
      }}
    />
  )
}

/**
 * Standard image renderer using <img> element.
 */
function StandardImage({ src }: { src: string }) {
  return (
    <img
      className="codap-web-view-image"
      src={src}
      alt="Image"
    />
  )
}

/**
 * Image component that automatically detects and works around browser bugs
 * with data URL rendering in <img> elements.
 */
function WebViewImage({ src }: { src: string }) {
  const [useCanvas, setUseCanvas] = useState<boolean | null>(hasDataUrlImageBug())

  useEffect(() => {
    if (useCanvas === null) {
      detectDataUrlImageBug().then(bugDetected => {
        setUseCanvas(bugDetected)
      })
    }
  }, [useCanvas])

  // While detecting, show nothing (detection is very fast)
  if (useCanvas === null) {
    return null
  }

  return useCanvas ? <CanvasImage src={src} /> : <StandardImage src={src} />
}

export const WebViewComponent = observer(function WebViewComponent({ tile }: ITileBaseProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const webViewModel = tile?.content

  useDataInteractiveController(iframeRef, tile)

  if (!isWebViewModel(webViewModel)) return null

  const hideWebViewLoading = booleanParam(urlParams.hideWebViewLoading)

  // Don't show backdrop for data URLs - truncated data URLs aren't useful for users
  const isDataUrl = webViewModel.url?.startsWith("data:")
  const showBackdrop = !webViewModel.isPluginCommunicating && !hideWebViewLoading && !isDataUrl
  // Truncate long URLs to prevent Safari from crashing when rendering huge strings as text
  const maxUrlLength = 1000
  const displayUrl = webViewModel.url?.length > maxUrlLength
    ? `${webViewModel.url.substring(0, maxUrlLength)}...`
    : webViewModel.url

  return (
    <div className={kWebViewBodyClass} data-testid="codap-web-view">
      {showBackdrop && (
        <div className="codap-web-view-backdrop">
          <div className="codap-web-view-url">{displayUrl}</div>
          <div className="codap-web-view-message">{t("DG.GameView.loadError")}</div>
        </div>
      )}
      <div className="codap-web-view-iframe-wrapper">
        { webViewModel.isImage
            ? <WebViewImage src={webViewModel.url} />
            : <iframe className="codap-web-view-iframe" ref={iframeRef} src={webViewModel.url} />
        }
      </div>
      <WebViewDropOverlay />
    </div>
  )
})
