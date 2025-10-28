import React from "react"
import { useProgress } from "../hooks/use-progress"

import "./progress.scss"

export const Progress = () => {
  const { progressMessage, progressMessageOptions } = useProgress()

  if (!progressMessage) {
    return null
  }

  const { lightbox } = progressMessageOptions || {}

  return (
    <div className={`progress-overlay ${lightbox ? "lightbox" : ""}`} data-testid="progress-overlay">
      <div className="progress-message" data-testid="progress-message">
        {progressMessage}
      </div>
    </div>
  )
}
