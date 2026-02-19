import { urlParams } from "./url-params"

// Strip redundant build number from prerelease version strings.
// e.g. "3.0.0-beta.2664" => "3.0.0-beta", but "3.0.0-rc.1" and "3.0.0" are unchanged.
export function displayVersion(version: string) {
  return version.replace(/(-[a-zA-Z]+)\.\d{4,}$/, "$1")
}

export function isBeta() {
  const pathSegments = window.location.pathname.split("/")
  return urlParams.release === "beta" || pathSegments.includes("beta")
}
