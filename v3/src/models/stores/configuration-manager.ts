import { merge } from "lodash"
import { UnitConfiguration } from "./unit-configuration"

type UC = UnitConfiguration

export class ConfigurationManager implements UnitConfiguration {

  private defaults: UnitConfiguration
  private configs: Array<Partial<UnitConfiguration>>

  // input configs should be top-to-bottom, e.g. unit, investigation, problem
  constructor(defaults: UnitConfiguration, configs: Array<Partial<UnitConfiguration>>) {
    this.defaults = defaults
    // reverse the array so searches are bottom-to-top, e.g. problem, investigation, unit
    this.configs = [...configs].reverse()
  }

  getProp<T>(prop: keyof UnitConfiguration) {
    const found = this.configs.find(config => config[prop] != null)?.[prop]
    return (found != null ? found : this.defaults[prop]) as T
  }

  /*
   * UnitConfiguration properties
   */
  get appName() {
    return this.getProp<UC["appName"]>("appName")
  }

  get pageTitle() {
    return this.getProp<UC["pageTitle"]>("pageTitle")
  }

  get defaultDocumentTitle() {
    return this.getProp<UC["defaultDocumentTitle"]>("defaultDocumentTitle")
  }

  get disableTileDrags() {
    return this.getProp<UC["disableTileDrags"]>("disableTileDrags")
  }

  /*
   * ProblemConfiguration properties
   */
  get disabledFeatures() {
    // settings are merged rather than simply returning the closest non-empty value
    const reverseConfigs = [...this.configs].reverse()
    const mergedDisabled: Record<string, string> = {}

    mergeDisabledFeatures(mergedDisabled, this.defaults.disabledFeatures)
    for (const config of reverseConfigs) {
      mergeDisabledFeatures(mergedDisabled, config.disabledFeatures)
    }

    return Object.values(mergedDisabled)
  }

  get placeholderText() {
    return this.getProp<UC["placeholderText"]>("placeholderText")
  }

  get settings(): UC["settings"]  {
    // settings are merged rather than simply returning the closest non-empty value
    const reverseSettings = [...this.configs].reverse().map(config => config.settings)
    return merge({}, this.defaults.settings, ...reverseSettings)
  }
}

export function mergeDisabledFeatures(disabled: Record<string, string>, disabledFeatures?: string[]) {
  disabledFeatures?.forEach(feature => {
    const result = /^!?(.+)/.exec(feature)
    const featureKey = result?.[1]
    featureKey && (disabled[featureKey] = feature)
  })
}
