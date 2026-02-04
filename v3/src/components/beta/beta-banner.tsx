import { Link, Text } from "@chakra-ui/react"
import { BetaButton } from "./beta-button"

import "./beta-banner.scss"

const kReleaseNotesUrl = "https://docs.google.com/document/d/1vreWYhmnPsQHR9Izb4z2je7b8nGdUrKZyHk04-0t1xA"

export function BetaBanner() {
  return (
    <div className="beta-banner">
      <Text className="beta-message" fontSize="sm" noOfLines={2}>
        <strong>Welcome to the CODAP V3 Public Beta!&nbsp;&nbsp;</strong>
        This is an early release—some features are yet to be implemented, and you may encounter bugs
        (see current <Link href={kReleaseNotesUrl} isExternal color="blue.500"><strong>Release Notes</strong></Link>).
        Please share your feedback and report issues using the button on the right!
      </Text>
      <BetaButton />
    </div>
  )
}
