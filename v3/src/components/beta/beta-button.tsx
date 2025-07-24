import React from "react"
import { urlParams } from "../../utilities/url-params"

import FeedbackIcon from "../../assets/icons/beta/feedback-icon.svg"

import "./beta-button.scss"

export function BetaButton() {
  if (urlParams.release !== "beta") return null

  return (
    <div className="beta-button-container">
      <button className="beta-button" onClick={() => window.open("https://forms.gle/QV9HTopKHC5C5tvq9", "_blank")}>
        <FeedbackIcon className="feedback-icon" />
        BETA Feedback
      </button>
    </div>
  )
}
