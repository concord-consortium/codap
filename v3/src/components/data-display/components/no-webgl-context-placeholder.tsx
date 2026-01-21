import React from "react"
import { t } from "../../../utilities/translation/translate"

import "./no-webgl-context-placeholder.scss"

interface IProps {
  width?: number
  height?: number
  left?: number
  top?: number
  /** Called when the user clicks on the placeholder to request a context */
  onClick?: () => void
}

/**
 * Placeholder shown when a graph cannot get a WebGL context.
 * This happens when there are too many graphs open (browser limits WebGL contexts to ~16).
 * Clicking on the placeholder will request a context with high priority.
 */
export function NoWebGLContextPlaceholder({ width, height, left, top, onClick }: IProps) {
  const style: React.CSSProperties = {
    position: "absolute",
    left: left ?? 0,
    top: top ?? 0,
    width: width ?? "100%",
    height: height ?? "100%",
    cursor: onClick ? "pointer" : undefined
  }

  return (
    <div
      className="no-webgl-context-placeholder"
      style={style}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick() } : undefined}
    >
      <div className="placeholder-content">
        <p className="placeholder-title">
          {t("V3.graph.noWebGLContext.title")}
        </p>
        <p className="placeholder-message">
          {t("V3.graph.noWebGLContext.message")}
        </p>
      </div>
    </div>
  )
}
