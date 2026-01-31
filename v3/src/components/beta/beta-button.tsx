import { isBeta } from "../../utilities/version-utils"

import FeedbackIcon from "../../assets/icons/beta/feedback-icon.svg"

import "./beta-button.scss"

export function BetaButton() {
  if (!isBeta()) return null

  const handleClick = () => {
    const link = document.createElement("a")
    link.href = "https://forms.gle/CSdkkszzLkrWY4ka8"
    link.target = "_blank"
    link.rel = "noopener noreferrer"
    link.click()
  }

  return (
    <div className="beta-button-container">
      <button className="beta-button" onClick={handleClick}>
        <FeedbackIcon className="feedback-icon" />
        BETA Feedback
      </button>
    </div>
  )
}
