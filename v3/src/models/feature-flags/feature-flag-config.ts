import { FeatureFlagName, isFeatureFlagName } from "./feature-flag-registry"

export type FeatureFlagDirective = "on" | "off"

export type FeatureFlagConfig = Partial<Record<FeatureFlagName, FeatureFlagDirective>>

/*
 * The server-side feature-flag configuration: a JSON object mapping flag names to
 * "on" or "off".
 *
 * The url points at codap-resources.concord.org directly rather than going through
 * codap.concord.org/codap-resources/*, which caches at the CloudFront edge for a
 * day and ignores Cache-Control: no-cache. A kill switch that takes 24 hours to
 * propagate is not a kill switch. The announcement banner bypasses the edge cache
 * for the same reason.
 */
export const kFeatureFlagConfigUrl = "https://codap-resources.concord.org/config/v3-feature-flags.json"

// how long to wait before giving up on the config fetch
export const kFeatureFlagFetchTimeout = 5000

function isDirective(value: unknown): value is FeatureFlagDirective {
  return value === "on" || value === "off"
}

/*
 * Reduces an arbitrary payload to the directives we recognize. Entries whose key
 * isn't a registered flag, or whose value isn't "on"/"off", are dropped.
 */
export function validateFeatureFlagConfig(data: unknown): FeatureFlagConfig {
  const config: FeatureFlagConfig = {}
  if (!data || typeof data !== "object" || Array.isArray(data)) return config
  Object.entries(data).forEach(([name, value]) => {
    if (isFeatureFlagName(name) && isDirective(value)) {
      config[name] = value
    }
  })
  return config
}

/*
 * Fails open: any error — offline, timeout, malformed json, non-2xx — yields an
 * empty config, leaving flags to the url and the document. The consequence is
 * that a server "off" can't reach a client that can't reach the server, which is
 * why "off" is a stopgap rather than retirement.
 */
export async function fetchFeatureFlagConfig(url = kFeatureFlagConfigUrl): Promise<FeatureFlagConfig> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), kFeatureFlagFetchTimeout)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) return {}
    return validateFeatureFlagConfig(await response.json())
  }
  catch {
    return {}
  }
  finally {
    clearTimeout(timeout)
  }
}
