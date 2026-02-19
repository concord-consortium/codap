import { urlParams } from "./url-params"

export function isBeta() {
  const pathSegments = window.location.pathname.split("/")
  return urlParams.release === "beta" || pathSegments.includes("beta")
}
