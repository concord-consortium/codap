import { action, makeObservable, observable } from "mobx"
import { urlParams } from "../../utilities/url-params"
import { FeatureFlagConfig, FeatureFlagDirective } from "./feature-flag-config"
import { FeatureFlagName, isFeatureFlagName } from "./feature-flag-registry"

export class FeatureFlagManager {
  @observable.shallow
  private serverFlags = new Map<FeatureFlagName, FeatureFlagDirective>()

  @observable.shallow
  private documentFlags = new Set<FeatureFlagName>()

  constructor() {
    makeObservable(this)
  }

  private get urlFlags(): ReadonlyMap<FeatureFlagName, boolean> {
    const flags = new Map<FeatureFlagName, boolean>()
    const source = urlParams.features ?? ""
    source.split(",").forEach(entry => {
      const trimmed = entry.trim()
      if (!trimmed) return
      const enabled = !trimmed.startsWith("-")
      const name = enabled ? trimmed : trimmed.slice(1)
      if (isFeatureFlagName(name)) flags.set(name, enabled)
    })
    return flags
  }

  /*
   * Loads the server configuration. Called at module load rather than from a
   * React effect so that it races the CFM document load rather than waiting for
   * React to mount. Document loading is reliably slower than a small json fetch,
   * so the server directives win that race in practice — which is what makes
   * "server off is absolute" a real guarantee rather than an aspiration.
   */
  async loadServerConfig(fetchConfig: () => Promise<FeatureFlagConfig>) {
    // fail open: the default fetchConfig already swallows its own errors, but a
    // rejection here would surface as an unhandled promise rejection at module
    // load, so guarantee an empty config rather than trust every future caller
    let config: FeatureFlagConfig = {}
    try {
      config = await fetchConfig()
    }
    catch {
      // leave config empty
    }
    this.setServerConfig(config)
  }

  @action
  setServerConfig(config: FeatureFlagConfig) {
    this.serverFlags.clear()
    Object.entries(config).forEach(([name, directive]) => {
      if (isFeatureFlagName(name) && directive) this.serverFlags.set(name, directive)
    })
  }

  @action
  setDocumentFlags(names: readonly string[]) {
    this.documentFlags.clear()
    names.forEach(name => {
      if (isFeatureFlagName(name)) this.documentFlags.add(name)
    })
  }

  /*
   * The flags a saved document should record as grants: those this session
   * enabled by url, and only those. Flags that are on because the server config
   * says so are excluded — they are on for everybody anyway, and writing them
   * down would resurrect the feature for those documents after it is later
   * turned off. Flags the server has killed are excluded because the user isn't
   * running the feature, so there is nothing to record.
   */
  get urlEnabledFlags(): FeatureFlagName[] {
    const flags: FeatureFlagName[] = []
    this.urlFlags.forEach((enabled, name) => {
      if (enabled && this.serverFlags.get(name) !== "off") flags.push(name)
    })
    return flags
  }

  isFeatureEnabled(name: FeatureFlagName): boolean {
    if (this.serverFlags.get(name) === "off") return false
    const urlValue = this.urlFlags.get(name)
    if (urlValue !== undefined) return urlValue
    if (this.serverFlags.get(name) === "on") return true
    return this.documentFlags.has(name)
  }
}

export const featureFlagManager = new FeatureFlagManager()

/*
 * The way gated code asks whether a feature is on. Read this during render, never
 * at module scope: gated features register unconditionally and gate only their
 * affordances, so that a document containing artifacts of a feature still opens
 * when the flag is off, and so that a late-arriving server directive takes effect
 * without a reload. See docs/feature-flags.md.
 */
export function isFeatureEnabled(name: FeatureFlagName): boolean {
  return featureFlagManager.isFeatureEnabled(name)
}
