import { urlParams } from "./url-params"

const betaUrls = [
  "https://codap3.concord.org/beta",
  "https://codap3.concord.org/branch/beta"
]

export function isBeta() {
  return urlParams.release === "beta" || betaUrls.some(url => window.location.href.startsWith(url))
}
